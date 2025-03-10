FROM node:18-alpine

WORKDIR /app

#COPY package*.json ./
#RUN npm install
#COPY . .
#RUN npm run build

EXPOSE 3000

#CMD ["npm", "start"]

# Faire tourner le container a l'infini car il se stop s'il n'y a rien dedans
ENTRYPOINT [ "tail", "-f", "/dev/null" ]