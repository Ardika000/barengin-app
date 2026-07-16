import axios from "axios";
import Echo from "laravel-echo";
import Pusher from "pusher-js";

window.axios = axios;
window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;

if (pusherKey) {
    window.Pusher = Pusher;
    window.Echo = new Echo({
        broadcaster: "pusher",
        key: pusherKey,
        cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
        forceTLS: true,
        // Otorisasi channel privat/presence lewat axios. pusher-js secara default
        // memakai XHR sendiri TANPA header X-XSRF-TOKEN, sehingga POST /broadcasting/auth
        // ditolak CSRF (419) -> channel privat gagal subscribe -> realtime mati dan
        // chat "jatuh" ke polling (terasa lambat ~5 detik). axios otomatis mengirim
        // token XSRF dari cookie, jadi otorisasi berhasil dan pesan masuk realtime.
        authorizer: (channel) => ({
            authorize: (socketId, callback) => {
                window.axios
                    .post("/broadcasting/auth", {
                        socket_id: socketId,
                        channel_name: channel.name,
                    })
                    .then((response) => callback(false, response.data))
                    .catch((error) => callback(true, error));
            },
        }),
    });
} else {
    console.warn(
        "[Echo] VITE_PUSHER_APP_KEY tidak ter-set saat build. Fitur realtime (chat) dinonaktifkan.",
    );
}