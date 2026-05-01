export function errorHandler(err, req, res, next) {
  console.error("❌ ERRO GLOBAL:", err);

  if (err.name === "ZodError") {
    return res.status(400).json({
      error: "Erro de validação",
      details: err.errors,
    });
  }

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "Registro duplicado",
    });
  }

  return res.status(500).json({
    error: "Erro interno do servidor",
  });
}
