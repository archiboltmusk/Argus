"""Local fake account services for Android tests. No real credentials or cloud writes."""
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, parse_qs

lock = threading.RLock()
data, tokens, refreshes = {}, {}, {}
counter = 0
fail_write = False

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def send(self, code, value):
        payload = json.dumps(value).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        self.handle_api(None)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 2 * 1024 * 1024:
            return self.send(413, {})
        self.handle_api(json.loads(self.rfile.read(length) or b"{}"))

    def handle_api(self, body):
        global counter, fail_write
        with lock:
            try:
                path = urlsplit(self.path).path
                query = parse_qs(urlsplit(self.path).query)
                if path == "/control/fail":
                    fail_write = True
                    return self.send(200, {})
                if path == "/control/expire":
                    tokens.clear()
                    return self.send(200, {})
                if path == "/control/offline-addon":
                    state = data[(body["provider"], body["user"], 1)]
                    url = "http://127.0.0.1:1/manifest.json"
                    if body["provider"] == "supabase":
                        state["media"]["addon:offline"] = {"kind": "addon", "value": {"url": url}, "deleted": False}
                    else:
                        field = "transportUrl" if body["provider"] == "stremio" else "url"
                        state["addons"][url] = {field: url, "name": "Offline", "enabled": True, "sort_order": 0}
                    return self.send(200, {})
                provider, rest = path.lstrip("/").split("/", 1)
                if rest == "auth/v1/token":
                    if query.get("grant_type") == ["refresh_token"]:
                        user = refreshes[body["refresh_token"]]
                    else:
                        assert body["password"] == "fixture-password"
                        user = body["email"]
                    counter += 1
                    access, refresh = f"fixture-access-{counter}", f"fixture-refresh-{counter}"
                    tokens[access] = user
                    refreshes[refresh] = user
                    return self.send(200, {"access_token": access, "refresh_token": refresh, "user": {"id": user}, "expires_in": 3600})
                if rest == "api/login":
                    assert body["password"] == "fixture-password"
                    user = body["email"]
                    auth = "fixture-stremio-" + user
                    tokens[auth] = user
                    return self.send(200, {"result": {"authKey": auth, "user": {"_id": user}}})
                token = body.get("authKey", "") if provider == "stremio" else self.headers.get("Authorization", "").removeprefix("Bearer ")
                if token not in tokens:
                    return self.send(401, {})
                user = tokens[token]
                params = body if isinstance(body, dict) else {}
                slot = params.get("p_profile_id", int(query.get("profile_id", ["eq.1"])[0].removeprefix("eq.")))
                state = data.setdefault((provider, user, slot), {"library": {}, "history": {}, "addons": {}, "media": {}})
                method = rest.split("/")[-1]
                writing = method.startswith(("sync_push", "sync_delete")) or method in ("datastorePut", "addonCollectionSet") or (method == "argus_media_sync" and body is not None)
                if provider == "nuvio" and writing:
                    assert 16 <= len(body["p_origin_client_id"]) <= 96
                if writing and fail_write:
                    fail_write = False
                    return self.send(503, {})
                result = []
                if provider == "stremio":
                    if method == "datastoreMeta":
                        result = [[key, "1"] for key in state["library"]]
                    elif method == "datastoreGet":
                        result = [state["library"][key] for key in body["ids"]]
                    elif method == "datastorePut":
                        state["library"].update({row["_id"]: row for row in body["changes"]})
                        result = {"success": True}
                    elif method == "addonCollectionGet":
                        result = {"addons": list(state["addons"].values())}
                    elif method == "addonCollectionSet":
                        state["addons"] = {row["transportUrl"]: row for row in body["addons"]}
                        result = {"success": True}
                    else:
                        raise ValueError(method)
                    return self.send(200, {"result": result})
                if provider == "supabase":
                    if body is not None:
                        for row in body:
                            assert row["user_id"] == user
                            state["media"][row["key"]] = row
                        result = {}
                    else:
                        assert query["user_id"] == ["eq." + user]
                        offset = int(query.get("offset", [0])[0])
                        result = list(state["media"].values())[offset:offset + 100]
                    return self.send(200, result)
                if method == "sync_pull_profiles":
                    result = [{"profile_index": 1, "name": "Main"}, {"profile_index": 2, "name": "Locked", "pin_enabled": True}]
                elif method == "verify_profile_pin":
                    result = {"unlocked": body["p_pin"] == "1234"}
                elif method == "sync_pull_library":
                    start = body["p_offset"]
                    result = list(state["library"].values())[start:start + body["p_limit"]]
                elif method == "sync_push_library_items":
                    state["library"].update({row["content_id"]: row for row in body["p_items"]})
                elif method == "sync_delete_library_items":
                    for key in body["p_keys"]:
                        state["library"].pop(key["content_id"], None)
                elif method == "sync_pull_watch_progress":
                    result = list(state["history"].values())
                elif method == "sync_push_watch_progress":
                    state["history"].update({row["progress_key"]: row for row in body["p_entries"]})
                elif method == "sync_delete_watch_progress":
                    for key in body["p_keys"]:
                        state["history"].pop(key, None)
                elif method == "addons":
                    result = list(state["addons"].values())
                elif method == "sync_push_addons":
                    state["addons"] = {row["url"]: row for row in body["p_addons"]}
                else:
                    raise ValueError(method)
                return self.send(200, result)
            except (KeyError, ValueError, AssertionError, TypeError):
                return self.send(422, {"error": "Invalid fixture contract"})

print("Android cloud fixtures: http://127.0.0.1:8770", flush=True)
ThreadingHTTPServer(("127.0.0.1", 8770), Handler).serve_forever()
