### BUILD STAGE

FROM node:20-bookworm AS build

WORKDIR /app

# Build dependencies
COPY package.json package-lock.json /app/
RUN npm install --frozen-lockfile

# Generate the licenses file and build
COPY . /app
RUN npm run generate-licenses && npm run build

### TESTS STAGE

FROM build AS tests

# Allow to import tests data files
COPY --from=test_data . /tests/data
