import { useState } from "react";

// Utils
import { getSocket } from "@/utils/socket";

// Styles
import Styles from "../styles.module.scss";

// "+ New tab" turns into a name field; Enter creates the tab, Escape or leaving the field cancels.
const NewTab = ({ onCreated }) => {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const close = () => {
    setEditing(false);
    setName("");
  };

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim()) return close();
    getSocket().emit("group:add", name, (res) => {
      if (res.error) return;
      close();
      onCreated(res.id);
    });
  };

  if (!editing) {
    return (
      <button type="button" className={Styles.newTab} onClick={() => setEditing(true)}>
        + New tab
      </button>
    );
  }
  return (
    <form className={Styles.newTab} onSubmit={submit}>
      <input
        autoFocus
        maxLength={40}
        placeholder="Tab name"
        aria-label="Tab name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={close}
        onKeyDown={(e) => e.key === "Escape" && close()}
      />
    </form>
  );
};

export default NewTab;
