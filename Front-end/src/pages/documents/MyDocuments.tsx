// TRECHO ALTERADO APENAS NO HISTÓRICO

// dentro do map de documentos adicionar ações

<div className="flex flex-wrap gap-2 mt-2">
  <Button size="sm" variant="outline" onClick={() => window.open(`/api/documents/${document.id}/view`, "_blank")}>
    Visualizar
  </Button>

  <Button size="sm" variant="outline" onClick={() => window.open(`/api/documents/${document.id}/download`, "_blank")}>
    Baixar
  </Button>
</div>

// OBS: restante do arquivo permanece igual
