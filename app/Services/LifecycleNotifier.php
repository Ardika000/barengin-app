<?php

namespace App\Services;

use App\Models\JastipItem;
use App\Models\PergiBareng;
use App\Models\Trip;
use App\Models\UserNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

// Notifikasi mulai/selesai trip, pergi bareng dan jastip. Jalannya lewat cron
// (notifications:lifecycle) atau freshenForUser() saat polling.
// Aman diulang karena tiap notifikasi punya dedupe_key.
class LifecycleNotifier
{
    private const WINDOW_DAYS = 2;

    private const THROTTLE_MINUTES = 5;

    public static function freshenForUser(int $userId): void
    {
        if (! $userId) {
            return;
        }

        // Cache::add() atomik: cuma request pertama dalam jendela throttle yang lolos.
        if (! Cache::add("lifecycle:user:{$userId}", 1, now()->addMinutes(self::THROTTLE_MINUTES))) {
            return;
        }

        try {
            (new self())->run($userId);
        } catch (\Throwable $e) {
            Log::warning('[LIFECYCLE] Gagal menyegarkan untuk user ' . $userId . ': ' . $e->getMessage());
        }
    }

    // $onlyUserId null = semua peserta (dipakai cron).
    public function run(?int $onlyUserId = null): int
    {
        return $this->tripBareng($onlyUserId)
            + $this->pergiBareng($onlyUserId)
            + $this->jastip($onlyUserId);
    }

    private function tripBareng(?int $onlyUserId): int
    {
        $sent = 0;
        $since = Carbon::today()->subDays(self::WINDOW_DAYS);

        Trip::where('status', Trip::STATUS_ONGOING)
            ->whereDate('start_date', '>=', $since)
            ->get()
            ->each(function (Trip $trip) use (&$sent, $onlyUserId) {
                $sent += $this->notifyTripBuyers($trip, 'activity.trip_ongoing', $onlyUserId);
            });

        Trip::where('status', Trip::STATUS_DONE)
            ->where(function ($q) use ($since) {
                $q->whereDate('end_date', '>=', $since)
                    ->orWhere('finished_at', '>=', $since);
            })
            ->get()
            ->each(function (Trip $trip) use (&$sent, $onlyUserId) {
                $sent += $this->notifyTripBuyers($trip, 'activity.trip_finished', $onlyUserId);
            });

        return $sent;
    }

    private function notifyTripBuyers(Trip $trip, string $type, ?int $onlyUserId): int
    {
        $runKey = optional($trip->current_run_started_at)->timestamp ?? 0;

        $userIds = DB::table('trip_orders')
            ->where('trip_id', $trip->id)
            ->where('order_status', 'paid')
            ->when(
                $trip->current_run_started_at,
                fn ($q) => $q->where('created_at', '>=', $trip->current_run_started_at),
            )
            ->distinct()
            ->pluck('user_id');

        return $this->dispatch(
            $this->filterRecipients($userIds, $onlyUserId),
            $type,
            ['name' => $trip->name],
            '/trip-bareng/' . $trip->id,
            fn ($uid) => $type . ':trip:' . $trip->id . ':run:' . $runKey . ':user:' . $uid,
        );
    }

    private function pergiBareng(?int $onlyUserId): int
    {
        $sent = 0;
        $since = Carbon::now()->subDays(self::WINDOW_DAYS);

        PergiBareng::with('pergi_bareng_participants')
            ->whereNull('finished_at')
            ->where('time_appointment', '<=', Carbon::now())
            ->where('time_appointment', '>=', $since)
            ->get()
            ->each(function (PergiBareng $pb) use (&$sent, $onlyUserId) {
                $sent += $this->notifyPergiParticipants($pb, 'activity.pergi_bareng_ongoing', $onlyUserId);
            });

        PergiBareng::with('pergi_bareng_participants')
            ->whereNotNull('finished_at')
            ->where('finished_at', '>=', $since)
            ->get()
            ->each(function (PergiBareng $pb) use (&$sent, $onlyUserId) {
                $sent += $this->notifyPergiParticipants($pb, 'activity.pergi_bareng_finished', $onlyUserId);
            });

        return $sent;
    }

    private function notifyPergiParticipants(PergiBareng $pb, string $type, ?int $onlyUserId): int
    {
        $userIds = $pb->pergi_bareng_participants->pluck('user_id')->filter()->unique();

        return $this->dispatch(
            $this->filterRecipients($userIds, $onlyUserId),
            $type,
            ['name' => $pb->name],
            '/pergi-bareng/' . $pb->id,
            fn ($uid) => $type . ':pb:' . $pb->id . ':user:' . $uid,
        );
    }

    private function jastip(?int $onlyUserId): int
    {
        $sent = 0;
        $since = Carbon::today()->subDays(self::WINDOW_DAYS);

        JastipItem::where('status', JastipItem::STATUS_PUBLISHED)
            ->where(function ($q) use ($since) {
                $q->whereDate('pickup_start_date', '>=', $since)
                    ->orWhereDate('pickup_end_date', '>=', $since);
            })
            ->get()
            ->each(function (JastipItem $item) use (&$sent, $onlyUserId) {
                $status = $item->lifecycleStatus();

                if ($status === 'pickup') {
                    $sent += $this->notifyJastipBuyers($item, 'activity.jastip_pickup', $onlyUserId);
                } elseif ($status === 'finish') {
                    $sent += $this->notifyJastipBuyers($item, 'activity.jastip_finished', $onlyUserId);
                }
            });

        return $sent;
    }

    private function notifyJastipBuyers(JastipItem $item, string $type, ?int $onlyUserId): int
    {
        $userIds = DB::table('jastip_order_items as joi')
            ->join('jastip_orders as jo', 'jo.id', '=', 'joi.jastip_order_id')
            ->join('transactions as t', 't.id', '=', 'jo.transaction_id')
            ->where('joi.jastip_item_id', $item->id)
            ->where('jo.order_status', 'paid')
            ->distinct()
            ->pluck('t.user_id');

        return $this->dispatch(
            $this->filterRecipients($userIds, $onlyUserId),
            $type,
            ['name' => $item->name],
            '/jastip/' . $item->id,
            fn ($uid) => $type . ':jastip:' . $item->id . ':user:' . $uid,
        );
    }


    private function filterRecipients($userIds, ?int $onlyUserId)
    {
        $ids = collect($userIds)->map(fn ($id) => (int) $id)->filter()->unique();

        if ($onlyUserId !== null) {
            return $ids->contains($onlyUserId) ? collect([$onlyUserId]) : collect();
        }

        return $ids;
    }

    private function dispatch($userIds, string $type, array $data, string $url, callable $dedupeKey): int
    {
        $count = 0;
        foreach ($userIds as $uid) {
            $n = UserNotification::send((int) $uid, $type, $data, $url, $dedupeKey($uid));
            if ($n) {
                $count++;
            }
        }

        return $count;
    }
}
