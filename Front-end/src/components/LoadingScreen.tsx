export default function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">
        Carregando sistema...
      </div>
    </div>
  );
}