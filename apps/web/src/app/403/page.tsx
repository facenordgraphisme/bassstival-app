export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-lg text-center space-y-4 py-16">
      <h1 className="text-3xl font-extrabold" style={{ fontFamily: "var(--font-title)" }}>
        Accès refusé
      </h1>
      <p className="opacity-80">
        Tu es bien connecté, mais ton rôle ne permet pas d’accéder à cette section.
      </p>
      <a href="/" className="btn mt-2">← Retour au tableau de bord</a>
    </div>
  );
}
