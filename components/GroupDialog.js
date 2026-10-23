"use client";

import { useId, useRef, useState } from "react";
import { getSocket } from "../lib/live.js";
import Avatar from "./Avatar.js";
import s from "./AddMonitor.module.scss";

// A trigger button plus a dialog to rename a tab, pick its monitors or delete it.
export default function GroupDialog({ group, groups, monitors, label, primary }) {
  const dialog = useRef();
  const titleId = useId();
  const [name, setName] = useState("");
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const tabName = (id) => groups.find((g) => g.id === id)?.name;

  function open() {
    setName(group.name);
    setPicked(monitors.filter((m) => m.group === group.id).map((m) => m.id));
    setError("");
    setArmed(false);
    dialog.current.showModal();
  }

  function toggle(id) {
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
  }

  function submit(e) {
    e.preventDefault();
    setBusy(true);
    getSocket().emit("group:save", { id: group.id, name, monitors: picked }, (res) => {
      setBusy(false);
      setError(res.error || "");
      if (res.error) return;
      dialog.current.close();
    });
  }

  function remove() {
    if (!armed) return setArmed(true);
    getSocket().emit("group:remove", group.id, () => dialog.current.close());
  }

  return (
    <>
      <button type="button" className={primary ? s.triggerPrimary : s.triggerQuiet} onClick={open}>
        {label}
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
              <h2 id={titleId}>Edit tab</h2>
              <p>Pick the monitors that belong here. A monitor sits in one tab at most.</p>
            </div>
            <button type="button" className={s.close} onClick={() => dialog.current.close()} aria-label="Close">
              ×
            </button>
          </header>

          <label className={s.field}>
            <span>Name</span>
            <input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <div className={s.field}>
            <span>
              Monitors <em>{picked.length} selected</em>
            </span>
            <div className={s.picks}>
              {monitors.map((m) => (
                <label key={m.id}>
                  <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                  <Avatar url={m.url} name={m.name} size={24} />
                  <strong>{m.name}</strong>
                  {m.group && m.group !== group.id && <em>in {tabName(m.group)}</em>}
                </label>
              ))}
            </div>
          </div>

          <footer className={s.foot}>
            {error ? (
              <p className={s.error}>{error}</p>
            ) : (
              <button type="button" className={s.danger} data-armed={armed} onClick={remove}>
                {armed ? "Click again to delete" : "Delete tab"}
              </button>
            )}
            <button type="button" className={s.cancel} onClick={() => dialog.current.close()}>
              Cancel
            </button>
            <button className={s.submit} disabled={busy}>
              {busy ? "Saving…" : "Save tab"}
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
