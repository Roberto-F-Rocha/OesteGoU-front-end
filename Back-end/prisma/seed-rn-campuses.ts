import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CampusSeed = {
  institution: string;
  campus: string;
  city: string;
  category: "PUBLICA" | "PRIVADA";
  logoUrl?: string;
  website?: string;
};

const campuses: CampusSeed[] = [
  { institution: "UFERSA", campus: "Campus Mossoró", city: "Mossoró", category: "PUBLICA", logoUrl: "https://ufersa.edu.br/wp-content/themes/ufersa/img/logo.svg", website: "https://ufersa.edu.br" },
  { institution: "UFERSA", campus: "Campus Pau dos Ferros", city: "Pau dos Ferros", category: "PUBLICA", logoUrl: "https://ufersa.edu.br/wp-content/themes/ufersa/img/logo.svg", website: "https://ufersa.edu.br" },
  { institution: "UFERSA", campus: "Campus Caraúbas", city: "Caraúbas", category: "PUBLICA", logoUrl: "https://ufersa.edu.br/wp-content/themes/ufersa/img/logo.svg", website: "https://ufersa.edu.br" },
  { institution: "UFERSA", campus: "Campus Angicos", city: "Angicos", category: "PUBLICA", logoUrl: "https://ufersa.edu.br/wp-content/themes/ufersa/img/logo.svg", website: "https://ufersa.edu.br" },

  { institution: "UFRN", campus: "Campus Central", city: "Natal", category: "PUBLICA", logoUrl: "https://www.ufrn.br/resources/documentos/identidadevisual/brasao/brasao_ufrn.png", website: "https://www.ufrn.br" },
  { institution: "UFRN", campus: "Escola Agrícola de Jundiaí", city: "Macaíba", category: "PUBLICA", logoUrl: "https://www.ufrn.br/resources/documentos/identidadevisual/brasao/brasao_ufrn.png", website: "https://www.ufrn.br" },
  { institution: "UFRN", campus: "CERES Caicó", city: "Caicó", category: "PUBLICA", logoUrl: "https://www.ufrn.br/resources/documentos/identidadevisual/brasao/brasao_ufrn.png", website: "https://www.ufrn.br" },
  { institution: "UFRN", campus: "CERES Currais Novos", city: "Currais Novos", category: "PUBLICA", logoUrl: "https://www.ufrn.br/resources/documentos/identidadevisual/brasao/brasao_ufrn.png", website: "https://www.ufrn.br" },
  { institution: "UFRN", campus: "FACISA", city: "Santa Cruz", category: "PUBLICA", logoUrl: "https://www.ufrn.br/resources/documentos/identidadevisual/brasao/brasao_ufrn.png", website: "https://www.ufrn.br" },

  { institution: "UERN", campus: "Campus Central", city: "Mossoró", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },
  { institution: "UERN", campus: "Campus Natal", city: "Natal", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },
  { institution: "UERN", campus: "Campus Assú", city: "Açu", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },
  { institution: "UERN", campus: "Campus Caicó", city: "Caicó", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },
  { institution: "UERN", campus: "Campus Pau dos Ferros", city: "Pau dos Ferros", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },
  { institution: "UERN", campus: "Campus Patu", city: "Patu", category: "PUBLICA", logoUrl: "https://portal.uern.br/wp-content/themes/uern/assets/images/logo-uern.svg", website: "https://portal.uern.br" },

  { institution: "IFRN", campus: "Campus Natal Central", city: "Natal", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Natal Zona Norte", city: "Natal", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Natal Cidade Alta", city: "Natal", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Parnamirim", city: "Parnamirim", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus São Gonçalo do Amarante", city: "São Gonçalo do Amarante", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Ceará-Mirim", city: "Ceará-Mirim", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Canguaretama", city: "Canguaretama", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus João Câmara", city: "João Câmara", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Macau", city: "Macau", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Mossoró", city: "Mossoró", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Apodi", city: "Apodi", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Pau dos Ferros", city: "Pau dos Ferros", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Caicó", city: "Caicó", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Currais Novos", city: "Currais Novos", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Santa Cruz", city: "Santa Cruz", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Nova Cruz", city: "Nova Cruz", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Lajes", city: "Lajes", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Ipanguaçu", city: "Ipanguaçu", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus Parelhas", city: "Parelhas", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },
  { institution: "IFRN", campus: "Campus São Paulo do Potengi", city: "São Paulo do Potengi", category: "PUBLICA", logoUrl: "https://portal.ifrn.edu.br/media/images/logo-ifrn.original.png", website: "https://portal.ifrn.edu.br" },

  { institution: "UnP", campus: "Campus Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.unp.br/wp-content/themes/unp/assets/images/logo.svg", website: "https://www.unp.br" },
  { institution: "UnP", campus: "Campus Mossoró", city: "Mossoró", category: "PRIVADA", logoUrl: "https://www.unp.br/wp-content/themes/unp/assets/images/logo.svg", website: "https://www.unp.br" },
  { institution: "UNI-RN", campus: "Campus Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.unirn.edu.br/assets/images/logo.svg", website: "https://www.unirn.edu.br" },
  { institution: "UNIFACEX", campus: "Campus Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.unifacex.com.br/wp-content/themes/unifacex/assets/images/logo.svg", website: "https://www.unifacex.com.br" },
  { institution: "Estácio", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://estacio.br/assets/imgs/logo-estacio.svg", website: "https://estacio.br" },
  { institution: "Estácio", campus: "Polo Mossoró", city: "Mossoró", category: "PRIVADA", logoUrl: "https://estacio.br/assets/imgs/logo-estacio.svg", website: "https://estacio.br" },
  { institution: "UNINASSAU", campus: "Campus Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.uninassau.edu.br/themes/custom/ser_educacional/logo.svg", website: "https://www.uninassau.edu.br" },
  { institution: "Faculdade Católica do Rio Grande do Norte", campus: "Campus Mossoró", city: "Mossoró", category: "PRIVADA", logoUrl: "https://catolicadorn.com.br/wp-content/uploads/2022/08/logo-catolica-rn.png", website: "https://catolicadorn.com.br" },
  { institution: "UNOPAR", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.unopar.com.br/assets/img/logo-unopar.svg", website: "https://www.unopar.com.br" },
  { institution: "UNOPAR", campus: "Polo Mossoró", city: "Mossoró", category: "PRIVADA", logoUrl: "https://www.unopar.com.br/assets/img/logo-unopar.svg", website: "https://www.unopar.com.br" },
  { institution: "UNINTER", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.uninter.com/wp-content/themes/grupo-uninter/images/logo-uninter.svg", website: "https://www.uninter.com" },
  { institution: "UNINTER", campus: "Polo Pau dos Ferros", city: "Pau dos Ferros", category: "PRIVADA", logoUrl: "https://www.uninter.com/wp-content/themes/grupo-uninter/images/logo-uninter.svg", website: "https://www.uninter.com" },
  { institution: "UNICESUMAR", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.unicesumar.edu.br/wp-content/themes/unicesumar/assets/img/logo-unicesumar.svg", website: "https://www.unicesumar.edu.br" },
  { institution: "UNIASSELVI", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://portal.uniasselvi.com.br/assets/img/logo.svg", website: "https://portal.uniasselvi.com.br" },
  { institution: "UNIP", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.unip.br/assets/img/logo-unip.svg", website: "https://www.unip.br" },
  { institution: "Cruzeiro do Sul", campus: "Polo Natal", city: "Natal", category: "PRIVADA", logoUrl: "https://www.cruzeirodosulvirtual.com.br/wp-content/themes/cruzeiro-virtual/assets/images/logo.svg", website: "https://www.cruzeirodosulvirtual.com.br" }
];

function buildUniversityName(campus: CampusSeed) {
  return `${campus.institution} - ${campus.campus}`;
}

async function main() {
  console.log("Iniciando seed de campi e polos do RN...");

  for (const campus of campuses) {
    const city = await prisma.city.findFirst({ where: { name: campus.city, state: "RN" } });

    if (!city) {
      console.log(`Cidade não encontrada: ${campus.city}`);
      continue;
    }

    const name = buildUniversityName(campus);
    const metadata = {
      institution: campus.institution,
      campus: campus.campus,
      category: campus.category,
      logoUrl: campus.logoUrl ?? null,
      website: campus.website ?? null,
    };

    const exists = await prisma.university.findFirst({ where: { name, cityId: city.id } });

    if (exists) {
      await prisma.university.update({
        where: { id: exists.id },
        data: {
          cityName: JSON.stringify(metadata),
          cityId: city.id,
        },
      });
      continue;
    }

    await prisma.university.create({
      data: {
        name,
        cityName: JSON.stringify(metadata),
        cityId: city.id,
      },
    });
  }

  console.log(`Seed de campi finalizado: ${campuses.length} campi/polos processados.`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed-rn-campuses:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
