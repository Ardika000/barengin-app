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
    });
} else {
    console.warn(
        "[Echo] VITE_PUSHER_APP_KEY tidak ter-set saat build. Fitur realtime (chat) dinonaktifkan.",
    );
}