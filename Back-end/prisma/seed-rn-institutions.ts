import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type InstitutionSeed = {
  acronym: string;
  name: string;
  category: "PUBLICA" | "PRIVADA";
  logoUrl?: string;
  website?: string;
};

const institutions: InstitutionSeed[] = [
  { acronym: "UFERSA", name: "Universidade Federal Rural do Semi-Árido", category: "PUBLICA", logoUrl: "https://ufersa.edu.br/wp-content/themes/ufersa/img/logo.svg", website: "https://ufersa.edu.br" },
  { acronym: "UFRN", name: "Universidade Federal do Rio Grande do Norte", category: "PUBLICA", logoUrl: "https://www.ufrn.br/resources/documentos/identidadevisual/brasao/brasao_ufrn.png", website: "https://www.ufrn.br" },
  { acronym: "UERN", name: "Universidade do Estado do Rio Grande do Norte", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },
  { acronym: "IFRN", name: "Instituto Federal do Rio Grande do Norte", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { acronym: "UnP", name: "Universidade Potiguar", category: "PRIVADA", logoUrl: "https://www.unp.br/wp-content/themes/unp/assets/images/logo.svg", website: "https://www.unp.br" },
  { acronym: "UNI-RN", name: "Centro Universitário do Rio Grande do Norte", category: "PRIVADA", logoUrl: "https://www.unirn.edu.br/assets/images/logo.svg", website: "https://www.unirn.edu.br" },
  { acronym: "Estácio", name: "Centro Universitário Estácio", category: "PRIVADA", logoUrl: "https://estacio.br/assets/imgs/logo-estacio.svg", website: "https://estacio.br" },
  { acronym: "UNINASSAU", name: "Centro Universitário Maurício de Nassau", category: "PRIVADA", logoUrl: "https://www.uninassau.edu.br/themes/custom/ser_educacional/logo.svg", website: "https://www.uninassau.edu.br" },
  { acronym: "FCRN", name: "Faculdade Católica do Rio Grande do Norte", category: "PRIVADA", logoUrl: "https://catolicadorn.com.br/wp-content/uploads/2022/08/logo-catolica-rn.png", website: "https://catolicadorn.com.br" },
  { acronym: "UNIFACEX", name: "Centro Universitário Facex", category: "PRIVADA", logoUrl: "https://www.unifacex.com.br/wp-content/themes/unifacex/assets/images/logo.svg", website: "https://www.unifacex.com.br" },
  { acronym: "UNIRB", name: "Centro Universitário UNIRB", category: "PRIVADA", logoUrl: "https://unirb.edu.br/wp-content/uploads/2021/05/logo-unirb.png", website: "https://unirb.edu.br" },
  { acronym: "FANEC", name: "Faculdade Natalense de Ensino e Cultura", category: "PRIVADA", website: "https://fanec.edu.br" },
  { acronym: "FARN", name: "Faculdade Natalense para o Desenvolvimento do Rio Grande do Norte", category: "PRIVADA" },
  { acronym: "UNOPAR", name: "Universidade Pitágoras Unopar Anhanguera", category: "PRIVADA", logoUrl: "https://www.unopar.com.br/assets/img/logo-unopar.svg", website: "https://www.unopar.com.br" },
  { acronym: "Anhanguera", name: "Faculdade Anhanguera", category: "PRIVADA", logoUrl: "https://www.anhanguera.com/assets/img/logo-anhanguera.svg", website: "https://www.anhanguera.com" },
  { acronym: "UNINTER", name: "Centro Universitário Internacional UNINTER", category: "PRIVADA", logoUrl: "https://www.uninter.com/wp-content/themes/grupo-uninter/images/logo-uninter.svg", website: "https://www.uninter.com" },
  { acronym: "UNICESUMAR", name: "Universidade Cesumar", category: "PRIVADA", logoUrl: "https://www.unicesumar.edu.br/wp-content/themes/unicesumar/assets/img/logo-unicesumar.svg", website: "https://www.unicesumar.edu.br" },
  { acronym: "UNIP", name: "Universidade Paulista", category: "PRIVADA", logoUrl: "https://www.unip.br/assets/img/logo-unip.svg", website: "https://www.unip.br" },
  { acronym: "Cruzeiro do Sul", name: "Universidade Cruzeiro do Sul", category: "PRIVADA", logoUrl: "https://www.cruzeirodosulvirtual.com.br/wp-content/themes/cruzeiro-virtual/assets/images/logo.svg", website: "https://www.cruzeirodosulvirtual.com.br" },
  { acronym: "UNIASSELVI", name: "Centro Universitário Leonardo da Vinci", category: "PRIVADA", logoUrl: "https://portal.uniasselvi.com.br/assets/img/logo.svg", website: "https://portal.uniasselvi.com.br" },
  { acronym: "UNIFIP", name: "Centro Universitário de Patos", category: "PRIVADA", logoUrl: "https://unifip.edu.br/assets/img/logo.png", website: "https://unifip.edu.br" },
  { acronym: "UNIFCV", name: "Centro Universitário Cidade Verde", category: "PRIVADA", logoUrl: "https://www.unifcv.edu.br/wp-content/uploads/2022/01/logo-unifcv.png", website: "https://www.unifcv.edu.br" },
  { acronym: "UNESA", name: "Universidade Estácio de Sá", category: "PRIVADA", logoUrl: "https://estacio.br/assets/imgs/logo-estacio.svg", website: "https://estacio.br" }
];

async function main() {
  console.log("Iniciando seed de instituições do RN...");

  for (const institution of institutions) {
    const name = `${institution.acronym} - Instituição`;
    const metadata = JSON.stringify({
      officialName: institution.name,
      acronym: institution.acronym,
      category: institution.category,
      logoUrl: institution.logoUrl ?? null,
      website: institution.website ?? null,
    });

    const exists = await prisma.university.findFirst({
      where: {
        name,
        cityId: null,
      },
    });

    if (exists) {
      await prisma.university.update({
        where: { id: exists.id },
        data: {
          cityName: metadata,
        },
      });
      continue;
    }

    await prisma.university.create({
      data: {
        name,
        cityName: metadata,
        cityId: null,
      },
    });
  }

  console.log(`Seed de instituições finalizado: ${institutions.length} instituições processadas.`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed-rn-institutions:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
