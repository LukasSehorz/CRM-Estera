import { redirect } from "next/navigation";

/**
 * Einstiegspunkt: leitet direkt auf die Start-Übersicht. Nicht eingeloggte
 * Nutzer fängt die Middleware ab und schickt sie auf /login.
 */
export default function Home() {
  redirect("/dashboard");
}
