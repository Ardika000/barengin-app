<?php

namespace App\Http\Controllers\Chat;

use App\Http\Controllers\Controller;
use App\Models\Conversation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChatConversationController extends Controller
{
    public function openOrCreatePersonal(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $me = $request->user();
        $otherId = (int) $data['user_id'];

        abort_if($otherId === $me->id, 422, 'Cannot chat with yourself.');

        $conversationId = Conversation::query()
            ->where('is_group', false)
            ->whereNull('trip_id')
            ->whereNull('pergi_bareng_id')
            ->whereHas('participants', fn ($q) => $q->where('users.id', $me->id))
            ->whereHas('participants', fn ($q) => $q->where('users.id', $otherId))
            ->value('id');

        if (! $conversationId) {
            $conversation = DB::transaction(function () use ($me, $otherId) {
                $conv = Conversation::create([
                    'trip_id' => null,
                    'pergi_bareng_id' => null,
                    'is_group' => false,
                ]);

                $conv->participants()->attach($me->id, ['last_read_at' => now()]);
                $conv->participants()->attach($otherId, ['last_read_at' => now()]);

                return $conv;
            });

            $conversationId = $conversation->id;
        }

        return redirect()->route('chat.show', ['conversation' => $conversationId]);
    }
}
