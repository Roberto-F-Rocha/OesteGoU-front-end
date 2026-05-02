// trecho modificado apenas na função handleUpload

async function handleUpload(event: React.FormEvent) {
  event.preventDefault();

  if (!file) {
    toast({ title: "Selecione um arquivo", description: "Escolha ou arraste um arquivo antes de enviar.", variant: "destructive" });
    return;
  }

  if (isDriver && type !== "profile_photo") {
    toast({ title: "Ação não permitida", description: "Motorista só pode alterar a foto de perfil.", variant: "destructive" });
    return;
  }

  try {
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", isDriver ? "profile_photo" : type);

    await api.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    toast({
      title: isDriver ? "Foto atualizada" : "Documento enviado",
      description: isDriver ? "Sua foto de perfil foi enviada com sucesso." : "Seu arquivo foi enviado para análise.",
    });

    // 🔥 NOVO: atualiza usuário imediatamente
    try {
      const { refreshUser } = useAuth();
      await refreshUser();
    } catch {}

    setFile(null);
    if (inputRef.current) inputRef.current.value = "";

    await loadDocuments();
  } catch (error: any) {
    toast({
      title: "Erro no upload",
      description: error?.response?.data?.error ?? "Não foi possível enviar o arquivo.",
      variant: "destructive",
    });
  } finally {
    setUploading(false);
  }
}
