import { Head, Link } from "@inertiajs/react";
import { BookOpen, Camera, ArrowRight, Info } from "lucide-react";
import { AppLayout } from "../../layouts/app-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { CameraTips } from "../../components/camera-tips";
const steps = [
  {
    title: "Cadastre o cliente",
    path: "Clientes → Novo cliente",
    text: "Cadastre o cliente e abra seus projetos. Os contatos ficam separados dos arquivos e resultados de cada projeto.",
  },
  {
    title: "Crie o projeto e envie os arquivos",
    path: "Cliente → Novo projeto → Arquivos e cenas",
    text: "O projeto recebe uma cópia do padrão geral. Envie um ou vários arquivos independentes. Para atualizar um arquivo, abra-o e envie uma nova revisão; não substituímos originais ou resultados antigos.",
  },
  {
    title: "Selecione cenas e fotografias",
    path: "Projeto → Arquivo → Abrir visualizador",
    text: "Use os checkboxes da galeria para marcar os enquadramentos. A seleção permanece ao pesquisar, trocar de página ou alternar cenas 3D. Câmeras exportadas usam sua lente; vistas recuperadas têm lente estimada de 35 mm. Você também pode escolher uma cena inteira com câmera automática ou ajustar uma vista manualmente.",
  },
  {
    title: "Configure a aparência",
    path: "Arquivo → Configure o resultado",
    text: "Use um preset, altere os campos, descreva a aparência para o Gemini ou importe um JSON. Todos usam o mesmo padrão de configurações. Revise a sugestão antes de aplicar. Você pode exportar o JSON e salvar seus próprios presets.",
  },
  {
    title: "Renderize e acompanhe",
    path: "Arquivo → Renderizar cenas selecionadas",
    text: "Somente os itens marcados serão enviados. Escolha Blender para gerar arquivos reais ou Simulação para testar sem produzir imagens. O arquivo, sua revisão, as vistas e o JSON usado ficam preservados em cada solicitação.",
  },
  {
    title: "Veja os resultados no projeto",
    path: "Projeto → Resultados do projeto",
    text: "Imagens, vídeos, panoramas e modelos VR ficam no projeto e no arquivo de origem. Abra um resultado VR para explorar em 3D ou WebXR. O padrão geral e os presets são compartilhados; cenas e arquivos gerados continuam no projeto.",
  },
];
export default function Help() {
  return (
    <AppLayout
      title="Como começar"
      description="Do GLB do quarto à primeira imagem: um roteiro para começar com um único ambiente e depois refinar o resultado para apresentar."
      actions={
        <>
          <Button asChild variant="outline">
            <a href="#camera">
              <Camera />
              Dicas de câmera
            </a>
          </Button>
          <Button asChild>
            <Link href="/projects">
              Abrir meus projetos
              <ArrowRight />
            </Link>
          </Button>
        </>
      }
    >
      <Head title="Guia do primeiro render" />
      <Card>
        <CardHeader>
          <CardTitle>O passo a passo</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="divide-y divide-border">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-4 py-5 first:pt-0 last:pb-0"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-input bg-card text-[13px] font-semibold tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mb-2 mt-1 font-mono text-xs text-accent-foreground">
                    {step.path}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.text}
                  </p>
                  {index === 4 && (
                    <a
                      href="#camera"
                      className="mt-3 inline-block text-sm font-medium underline decoration-border underline-offset-4 hover:decoration-foreground"
                    >
                      Veja como escolher posição e direção
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <section className="flex gap-3 rounded-lg border border-info/25 bg-info-soft p-4 text-sm leading-relaxed">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
        <p>
          O GLB original permanece salvo na versão do projeto. Cada render
          registra o ambiente, a versão e a tentativa utilizados. Os resultados
          ficam na Galeria do Render Studio, não numa galeria do Blender, e uma
          nova execução não substitui imagens anteriores.
        </p>
      </section>
      <Card id="camera" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Posicionando a câmera do quarto</CardTitle>
        </CardHeader>
        <CardContent>
          <CameraTips />
        </CardContent>
      </Card>
      <Button asChild>
        <Link href="/renderings/new">
          Criar um render
          <ArrowRight />
        </Link>
      </Button>
    </AppLayout>
  );
}
