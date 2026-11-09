import { Link } from "@inertiajs/react";
import { Camera, MoveUp, ArrowRight, Focus } from "lucide-react";
export function CameraTips({ compact = false }: { compact?: boolean }) {
  const content = (
    <div className="space-y-5 text-sm leading-relaxed">
      <ol className="space-y-3">
        <li>
          <strong>1. Coloque a câmera dentro do quarto.</strong> Escolha um
          canto ou a entrada e deixe espaço até as paredes. Uma câmera dentro de
          uma parede ou móvel pode produzir uma imagem bloqueada.
        </li>
        <li>
          <strong>2. Ajuste a altura do olhar.</strong> Se o modelo estiver em
          metros, experimente de 1,50 a 1,60 m acima do piso. No sistema de
          câmeras, a altura é o eixo Y: some essa altura à cota do piso.
        </li>
        <li>
          <strong>3. Aponte para o que quer mostrar.</strong> Comece olhando
          para a cama, a marcenaria ou uma composição do ambiente. Mantenha a
          rotação Z em 0° para começar com o horizonte nivelado.
        </li>
        <li>
          <strong>4. Comece com perspectiva e uma lente de 24 a 35 mm.</strong>{" "}
          Um número menor mostra mais espaço; um número maior fecha o
          enquadramento. Evite abrir demais o ângulo só para caber tudo, pois as
          bordas podem ficar distorcidas.
        </li>
        <li>
          <strong>5. Faça um Teste rápido.</strong> Confira o que aparece na
          imagem, ajuste uma coisa de cada vez e só depois escolha Apresentação.
        </li>
      </ol>
      {!compact && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              [MoveUp, "Posição", "X: lados · Y: altura · Z: profundidade"],
              [
                ArrowRight,
                "Rotação",
                "Y: girar para os lados · X: inclinar para cima/baixo · Z: inclinar o horizonte",
              ],
              [
                Focus,
                "Distância focal",
                "Menos mm: mostra mais · Mais mm: aproxima o enquadramento",
              ],
            ].map(([Icon, title, text]) => {
              const Component = Icon as typeof Camera;
              return (
                <div
                  key={String(title)}
                  className="rounded-lg border bg-muted/20 p-4"
                >
                  <Component className="mb-3 size-5 text-accent-foreground" />
                  <h3 className="font-medium">{String(title)}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {String(text)}
                  </p>
                </div>
              );
            })}
          </div>
          <section className="rounded-lg border p-5">
            <h3 className="font-medium">Como entender a direção</h3>
            <p className="mt-2 text-muted-foreground">
              Com rotação X = 0°, Y = 0° e Z = 0°, a câmera olha na direção de Z
              negativo. Girando apenas Y para 180°, ela olha no sentido
              contrário; Y = −90° aponta para X positivo e Y = 90° para X
              negativo.
            </p>
            <p className="mt-2 text-muted-foreground">
              Com os outros eixos em zero, X negativo inclina para baixo e X
              positivo para cima. Ajuste poucos graus por vez. As rotações são
              combinadas, então confira sempre a imagem.
            </p>
          </section>
          <section className="rounded-lg border border-brand-200 bg-brand-50 p-5 dark:border-brand-900 dark:bg-brand-950">
            <h3 className="font-medium">
              Um exemplo para entender, não uma posição universal
            </h3>
            <p className="mt-2 text-muted-foreground">
              Em um modelo em metros, com piso em Y = 0 e o que você quer
              mostrar próximo de X = 0 e Z = 0, a posição X = 0, Y = 1,60 e Z =
              3, com rotação 0°, 0°, 0°, olha horizontalmente em direção ao
              objeto.
            </p>
            <p className="mt-2 font-medium">
              Seu arquivo pode ter outra origem, escala ou orientação. Localize
              o quarto antes de usar qualquer número.
            </p>
          </section>
          <section>
            <h3 className="font-medium">Se o teste não ficou bom</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                Só aparece uma parede ou a imagem está bloqueada: mova a câmera
                para dentro da área livre e confira a direção.
              </li>
              <li>
                O quarto aparece por fora: use uma câmera interna cadastrada, em
                vez da vista geral automática.
              </li>
              <li>
                Os móveis parecem esticados nas bordas: aumente a distância
                focal e tente afastar a câmera, sem atravessar a parede.
              </li>
              <li>
                A imagem está escura: confira se a câmera está na área livre e
                revise a iluminação. Só aumentar a qualidade não corrige a luz.
              </li>
            </ul>
          </section>
        </>
      )}
      <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        Na aba Câmeras, abra o visualizador, ajuste o enquadramento e clique em
        Usar esta visão como câmera. Depois dê um nome e salve. Girar ou dar
        zoom sozinho não salva alterações.
      </p>
    </div>
  );
  return compact ? (
    <details className="rounded-lg border bg-muted/20 p-4">
      <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <Camera className="size-4 text-accent-foreground" />
        Dicas para posicionar a câmera
      </summary>
      <div className="mt-4">
        {content}
        <Link
          href="/help#camera"
          className="mt-4 inline-block text-sm font-medium text-primary underline"
        >
          Ver o guia completo com exemplos de direção
        </Link>
      </div>
    </details>
  ) : (
    content
  );
}
