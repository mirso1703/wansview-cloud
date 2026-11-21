# Wansview Cloud for Home Assistant

Unofficial integration for Wansview / Cinnado cameras that only work through the **Wansview Cloud** app (AJCloud platform).

Per camera: motion, last motion time, last snapshot (image), battery, Wi-Fi signal, online.

Install: Marketplace/HACS → custom repository → `mirso1703/wansview-cloud` (Integration), restart, then add **Wansview Cloud** and sign in with your app account.

Protocol: NaCl-box sign-in and HMAC-SHA256 signed requests (see Elastic Security Labs research and the colivinglemans-prog/coliving-barbusse AJCloud client).
