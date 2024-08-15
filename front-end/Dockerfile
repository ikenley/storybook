# syntax=docker/dockerfile:1

FROM node:22 AS build

# Install git, SSH, and other utilities
RUN apt-get update && apt-get install -y jq

# Install AWS CLI v2
# https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2-linux.html
RUN curl https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /opt \
    && /opt/aws/install --update -i /usr/local/aws-cli -b /usr/local/bin \
    && rm /tmp/awscliv2.zip \
    && rm -rf /opt/aws \
    && aws --version

WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install
# If you are building your code for production
#RUN npm ci --only=production

# Copy "source code"
COPY . .

ARG VERSION
ENV VERSION=$VERSION

ENTRYPOINT ["/bin/bash", "/usr/src/app/scripts/generate_site.sh" ]