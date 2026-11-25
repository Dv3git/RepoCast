# Guion del vídeo de RepoCast

Duración objetivo: **unos 7 minutos**. El enunciado obliga a grabar la pantalla mientras se explica; mostrar la cara es opcional.

## Antes de grabar

- [ ] App desplegada abierta en Chrome a pantalla completa y sin otras pestañas. Zoom al 110 % para que el texto se lea en el vídeo.
- [ ] Sesión cerrada (para enseñar el login) y la presentación abierta en otra ventana.
- [ ] Cupo libre en la cuenta demo (3 podcasts al día).
- [ ] Un repositorio preparado para generar en directo que **no** esté ya en la galería, por ejemplo `https://github.com/pmndrs/jotai` o `https://github.com/tj/commander.js`. Tarda alrededor de un minuto: mientras se genera se habla del pipeline (bloque 4).
- [ ] Notificaciones del sistema desactivadas y el volumen del ordenador grabándose, para que se oiga el podcast.
- [ ] Herramienta: OBS Studio o la grabadora de Windows (Win + Alt + R). Sube el vídeo a YouTube como "No listado" y pon el enlace en el README.

---

## 1. Presentación · 0:00-0:40

**Pantalla:** diapositiva 1 (portada) y después la 2 (el problema).

> Hola, soy [tu nombre] y este es mi proyecto final del Máster de Desarrollo con IA: **RepoCast**.
>
> Cuando llegas a un proyecto nuevo o quieres entender una librería, te encuentras cientos de ficheros y un README que te dice cómo instalarla, pero no cómo está construida por dentro. RepoCast resuelve eso: pegas la URL de un repositorio de GitHub y en un minuto tienes un **podcast de dos voces** que te lo explica, un **mapa de su arquitectura**, una **visita guiada** por el código y un **chat** para preguntarle.

## 2. Primer contacto · 0:40-1:30

**Pantalla:** la portada de la app y luego la galería (*Explorar*).

> Esta es la aplicación desplegada en Vercel. Sin cuenta ya se pueden escuchar todos los episodios de la galería: hay repositorios en TypeScript, Python y Rust, en español y en inglés, y con distintos estilos.

**Acción:** abre el episodio de **ky** con humor y dale al play unos 10 segundos.

> Lucía hace de presentadora y pregunta lo que preguntaría cualquiera, y Mateo es el experto que se ha leído el código. Fijaos en que la transcripción **sigue al audio** y en que, cuando hablan de un módulo, **se ilumina en el mapa**.

## 3. Crear un podcast · 1:30-2:15

**Acción:** pulsa *Entrar* y después **"Probar con la cuenta demo"**.

> Para generar episodios hace falta una cuenta. El registro no pide confirmar el email, y para la corrección hay una cuenta demo que se rellena con este botón.

**Acción:** ve a *+ Nuevo*, pega la URL preparada, elige **Español · Normal (3 min) · Con humor** y pulsa *Generar podcast*.

> Elijo el idioma, la duración y el estilo: divulgativo, técnico o con humor. También podría pedir un podcast de **novedades** entre dos versiones del repositorio. Le doy a generar.

## 4. Mientras se genera: cómo funciona · 2:15-3:30

**Pantalla:** la pantalla de progreso. Si va rápido, alterna con la diapositiva 9 (*Cómo se fabrica un episodio*).

> Ahora mismo están pasando cuatro cosas, y cada una es una petición independiente al servidor:
>
> 1. **Ingesta:** la API de GitHub me da el árbol del repositorio y un algoritmo de puntuación elige hasta 80 ficheros clave (README, manifiestos, puntos de entrada) dentro de un presupuesto de caracteres.
> 2. **Análisis:** Claude lee ese código y devuelve un JSON validado con Zod, con los módulos, las relaciones y una visita guiada con líneas exactas. Después mi código limpia las rutas inventadas o las líneas fuera de rango.
> 3. **Guion:** Claude escribe el diálogo con la duración y el estilo pedidos. Si se pasa de palabras, se le pide otra versión.
> 4. **Voces:** Gemini TTS pone las dos voces, y yo uno los trozos de audio, calculo los tiempos de cada frase y lo codifico a MP3.
>
> Como cada paso es una petición corta, cabe en las funciones de Vercel. Si un paso falla se reintenta, y si se cae del todo puedo reanudarlo desde el último paso completado.

## 5. Recorrido por el episodio · 3:30-5:30

**Acción:** cuando termine, dale al play unos segundos.

**Mapa:** pasa el ratón y haz clic en un módulo.

> Este es el mapa de la arquitectura, dibujado con React Flow. Cada caja es un módulo real del repositorio, con sus ficheros.

**Visita guiada:** cambia de pestaña y recorre dos o tres paradas.

> La visita guiada recorre el código como lo haría un compañero veterano: del punto de entrada al flujo principal, con las líneas importantes resaltadas y un enlace a GitHub.

**Chat:** pregunta algo concreto del repositorio, por ejemplo "¿Dónde se gestiona el estado y cómo se suscriben los componentes?".

> El chat responde sobre el código real y **cita ficheros y líneas**. Si pulso una cita, se abre el código. El repositorio va en la caché de prompts de Claude, así que las preguntas siguientes son más rápidas y baratas.

**Capítulos:** pulsa un capítulo de la tira bajo el reproductor.

> El episodio viene dividido en capítulos, que también aparecen como cortes en la forma de onda y como títulos en la transcripción.

**Flujo:** cambia a la pestaña *Flujo* y pulsa un paso del diagrama.

> Esto es el recorrido principal del código como diagrama de secuencia: quién llama a quién y en qué orden. Cada paso abre su código, y se puede copiar en formato Mermaid para pegarlo en un README.

**Notas:** en la pestaña *Notas*, escribe una nota corta y pulsa *Marcar este momento*.

> Mientras escucho puedo guardar notas o marcadores en el segundo exacto. Salen como puntos amarillos sobre el audio y son privados.

**Compartir:** abre la pestaña y marca *Empezar en…*.

> Cada episodio tiene una página pública, un reproductor que se puede incrustar en cualquier web y un badge para poner en el README del proyecto. Además puedo compartir un momento concreto: el enlace lleva el segundo.

**Guía escrita:** pulsa *📄 Guía escrita* arriba a la derecha.

> Y si prefiero leer, todo el episodio se convierte en una guía: arquitectura, flujo, visita guiada con el código, glosario y mis notas. Se imprime, se guarda en PDF o se descarga en Markdown.

## 6. Técnica y calidad · 5:30-6:30

**Pantalla:** diapositivas 8 (arquitectura), 10 (stack) y 11 (costes y seguridad). Opcional: el código en VS Code (`src/lib/pipeline.ts` y `src/lib/claude.ts`).

> Por dentro es una aplicación **Next.js 16** con React 19 y TypeScript. Usa Cache Components para que las páginas sirvan al instante una parte estática y el resto llegue en streaming. **Supabase** se encarga de los usuarios, la base de datos y los audios.
>
> Me he preocupado del coste y la seguridad:
> - Un repositorio nuevo cuesta alrededor de **un céntimo** en Claude Haiku y unos **cuatro céntimos** en voces.
> - Repetir un episodio que ya existe cuesta cero.
> - Hay cupos por usuario y uno global.
> - Las claves solo viven en el servidor, y las tablas tienen RLS sin políticas públicas.
> - El código de los repositorios se trata como dato no confiable frente a la inyección de prompts.
>
> En cuanto a pruebas, hay tests unitarios con Vitest y una prueba de extremo a extremo con Playwright que recorre toda la aplicación en Chrome.

## 7. IA en el desarrollo y cierre · 6:30-7:15

**Pantalla:** diapositiva 12 y después la 13 (cierre).

> La IA está en el producto, pero también ha sido mi herramienta de trabajo. He desarrollado con **Claude Code** como compañero de programación, contrastando siempre con la documentación oficial (Next.js 16 tiene muchos cambios) y validando cada integración con pruebas reales contra las APIs.
>
> Como siguientes pasos: repositorios privados, un feed RSS para escuchar los episodios en cualquier app de podcasts y episodios automáticos con cada nueva versión.
>
> Tenéis la demo, el código y la cuenta de prueba en el README. ¡Gracias!

---

## Consejos

- Si la generación en directo tarda o falla, corta y enseña un episodio de la galería: el mensaje es el mismo.
- Habla con calma: 7 minutos es poco, pero sobra si no te paras en detalles.
- Revisa el vídeo antes de subirlo: el audio del podcast tiene que oírse.
