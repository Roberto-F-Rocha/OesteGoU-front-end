import DocumentUpload from "@/components/upload/DocumentUpload";

export default function MyDocuments() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Meus Documentos</h1>
        <p className="text-muted-foreground text-sm">
          Envie seus documentos para validação. Alguns podem precisar de aprovação da administração.
        </p>
      </div>

      <DocumentUpload
        type="profile_photo"
        title="Foto de perfil"
        description="Imagem do usuário para identificação no sistema."
        accept="image/*"
      />

      <DocumentUpload
        type="enrollment_proof"
        title="Comprovante de matrícula"
        description="Documento obrigatório para alunos."
      />

      <DocumentUpload
        type="driver_license"
        title="CNH"
        description="Obrigatório para motoristas cadastrados."
      />

      <DocumentUpload
        type="general"
        title="Documento adicional"
        description="Envie qualquer documento solicitado pela administração."
      />
    </div>
  );
}
