"use client";

import { useRef, useState } from "react";
import { getSocket } from "../lib/live.js";
import s from "./AddMonitor.module.scss";

const EMPTY = { name: "", url: "", method: "GET", headers: [], body: "" };

function jsonError(text) {
  if (!text.trim()) return "";
  try {
    JSON.parse(text);
    return "";
  } catch (err) {
    return err.message;
  }
}

// A trigger button plus the native <dialog> it opens.
export default function AddMonitor({ label = "New monitor", primary }) {
  const dialog = useRef();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setHeader = (i, field, value) =>
    setForm({ ...form, headers: form.headers.map((h, j) => (j === i ? { ...h, [field]: value } : h)) });
  const bodyError = form.method === "POST" ? jsonError(form.body) : "";

  function open() {
    setForm(EMPTY);
    setError("");
    dialog.current.showModal();
  }

  function submit(e) {
    e.preventDefault();
    if (bodyError) return setError("Request body must be valid JSON.");
    setBusy(true);
    getSocket().emit("add", form, (res) => {
      setBusy(false);
      setError(res.error || "");
      if (res.error) return;
      dialog.current.close();
    });
  }

  return (
    <>
      <button type="button" className={primary ? s.triggerPrimary : s.trigger} onClick={open}>
        <span aria-hidden="true">+</span> {label}
      </button>

      <dialog
        ref={dialog}
        className={s.dialog}
        aria-labelledby="add-title"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
      >
        <form className={s.sheet} onSubmit={submit}>
          <header className={s.head}>
            <div>
              <h2 id="add-title">New monitor</h2>
              <p>moon will request this URL every minute and record how fast it answers.</p>
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

          <div className={s.field}>
            <span>Headers <em>optional</em></span>
            {form.headers.map((h, i) => (
              <div key={i} className={s.headerRow}>
                <input placeholder="Authorization" value={h.key} onChange={(e) => setHeader(i, "key", e.target.value)} aria-label="Header name" />
                <input placeholder="Bearer …" value={h.value} onChange={(e) => setHeader(i, "value", e.target.value)} aria-label="Header value" />
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
              <textarea rows={6} spellCheck={false} placeholder={'{\n  "ping": true\n}'} value={form.body} onChange={set("body")} />
              {bodyError && <small className={s.hint}>{bodyError}</small>}
            </label>
          )}

          <footer className={s.foot}>
            {error ? <p className={s.error}>{error}</p> : <p>Header values stay on the server.</p>}
            <button type="button" className={s.cancel} onClick={() => dialog.current.close()}>
              Cancel
            </button>
            <button className={s.submit} disabled={busy}>
              {busy ? "Adding…" : "Start monitoring"}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
