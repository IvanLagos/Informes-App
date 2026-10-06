# Imagen para Render: Node + LibreOffice (para convertir el informe a PDF).
FROM node:22-bookworm-slim

# LibreOffice Writer y fuentes con las mismas medidas que Calibri/Cambria/Arial,
# para que el PDF quede igual que el Word.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libreoffice-writer-nogui \
    fonts-crosextra-carlito \
    fonts-crosextra-caladea \
    fonts-liberation \
    fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .
RUN npm run build

ENV NODE_ENV=production
CMD ["npm", "start"]
