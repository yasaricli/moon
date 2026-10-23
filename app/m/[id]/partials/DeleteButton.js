import { useState } from "react";
import { useRouter } from "next/navigation";

// Utils
import { getSocket } from "@/utils/socket";

// Styles
import Styles from "../styles.module.scss";

// The first click arms it for three seconds, the second deletes.
const DeleteButton = ({ id }) => {
  const router = useRouter();
  const [armed, setArmed] = useState(false);

  const click = () => {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    getSocket().emit("remove", id, () => router.push("/"));
  };

  return (
    <button className={Styles.delete} data-armed={armed} onClick={click}>
      {armed ? "Click again to confirm" : "Delete monitor"}
    </button>
  );
};

export default DeleteButton;
