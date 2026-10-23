"use client";

import { useId, useRef, useState } from "react";
import { getSocket } from "../lib/live.js";
import s from "./AddMonitor.module.scss";

const EMPTY = { name: "", group: "", url: "", method: "GET", headers: [], body: "" };

function jsonError(text) {
  if (!text.trim()) return "";
  try {
    JSON.parse(text);
    return "";
  } catch (err) {
    return err.message;
  }
}

// Header values and the body never reach the browser, so an edit starts
// with header names only and both left blank to keep the stored values.
const fromMonitor = (m) => ({
  name: m.name,
  group: m.group,
  url: m.url,
  method: m.method,
  headers: m.headerNames.map((key) => ({ key, value: "" })),
  body: "",
});

// A trigger button plus the native <dialog> it opens. With `monitor`, it edits that monitor.
export default function AddMonitor({ label = "New monitor", primary, monitor }) {
  const dialog = useRef();
  const titleId = useId();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [groups, setGroups] = useState([]);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setHeader = (i, field, value) =>
    setForm({ ...form, headers: form.headers.map((h, j) => (j === i ? { ...h, [field]: value } : h)) });
  const bodyError = form.method === "POST" ? jsonError(form.body) : "";

  function open() {
    setForm(monitor ? fromMonitor(monitor) : EMPTY);
    setError("");
    getSocket().emit("groups", setGroups);
    dialog.current.showModal();
  }

  function submit(e) {
    e.preventDefault();
    if (bodyError) return setError("Request body must be valid JSON.");
    setBusy(true);
    const [event, data] = monitor ? ["edit", { ...form, id: monitor.id }] : ["add", form];
    getSocket().emit(event, data, (res) => {
      setBusy(false);
      setError(res.error || "");
      if (res.error) return;
      dialog.current.close();
    });
  }

  return (
    <>
      <button type="button" className={monitor ? s.triggerQuiet : primary ? s.triggerPrimary : s.trigger} onClick={open}>
        {!monitor && <span aria-hidden="true">+</span>} {label}
      </button>

      <dialog
        ref={dialog}
        className={s.dialog}
        aria-labelledby={titleId}
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <form className={s.sheet} onSubmit={submit}>
          <header className={s.head}>
            <div>
              <h2 id={titleId}>{monitor ? "Edit monitor" : "New monitor"}</h2>
              <p>
                {monitor
                  ? "Changes apply from the next check. The history stays with the monitor."
                  : "moon will request this URL every minute and record how fast it answers."}
              </p>
            </div>
            <button type="button" className={s.close} onClick={() => dialog.current.close()} aria-label="Close">
              ×
            </button>
          </header>

          <div className={s.field}>
            <span>Request</span>
            <div className={s.request}>
              <div className={s.method} role="radiogroup" aria-label="Method">
                {["GET", "POST"].map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={form.method === m} onClick={() => setForm({ ...form, method: m })}>
                    {m}
                  </button>
                ))}
              </div>
              <input
                className={s.url}
                type="url"
                required
                autoFocus
                placeholder="https://api.example.com/health"
                value={form.url}
                onChange={set("url")}
                aria-label="URL"
              />
            </div>
          </div>

          <label className={s.field}>
            <span>Name <em>optional</em></span>
            <input placeholder="Defaults to the host name" maxLength={60} value={form.name} onChange={set("name")} />
          </label>

          {!!groups.length && (
            <label className={s.field}>
              <span>Tab <em>optional</em></span>
              <select value={form.group} onChange={set("group")}>
                <option value="">No tab</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className={s.field}>
            <span>Headers <em>optional</em></span>
            {form.headers.map((h, i) => (
              <div key={i} className={s.headerRow}>
                <input placeholder="Authorization" value={h.key} onChange={(e) => setHeader(i, "key", e.target.value)} aria-label="Header name" />
                <input placeholder={monitor?.headerNames.includes(h.key) ? "Unchanged" : "Bearer …"} value={h.value} onChange={(e) => setHeader(i, "value", e.target.value)} aria-label="Header value" />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, headers: form.headers.filter((_, j) => j !== i) })}
                  aria-label="Remove header"
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className={s.ghost} onClick={() => setForm({ ...form, headers: [...form.headers, { key: "", value: "" }] })}>
              + Add header
            </button>
          </div>

          {form.method === "POST" && (
            <label className={s.field}>
              <span>
                JSON body
                {form.body.trim() && <b data-tone={bodyError ? "down" : "up"}>{bodyError ? "invalid JSON" : "valid JSON"}</b>}
              </span>
              <textarea rows={6} spellCheck={false} placeholder={monitor?.bodySize ? `Unchanged (${monitor.bodySize} B). Type to replace.` : '{\n  "ping": true\n}'} value={form.body} onChange={set("body")} />
              {bodyError && <small className={s.hint}>{bodyError}</small>}
            </label>
          )}

          <footer className={s.foot}>
            {error ? <p className={s.error}>{error}</p> : <p>Header values stay on the server.</p>}
            <button type="button" className={s.cancel} onClick={() => dialog.current.close()}>
              Cancel
            </button>
            <button className={s.submit} disabled={busy}>
              {monitor ? (busy ? "Saving…" : "Save changes") : busy ? "Adding…" : "Start monitoring"}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
