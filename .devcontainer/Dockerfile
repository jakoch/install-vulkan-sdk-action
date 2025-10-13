#FROM debian:trixie-slim
FROM node:24-trixie-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN echo "Packages" && \
    apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    gnupg \
    curl wget \
    dirmngr \
    git git-lfs \
    jq \
    grep ripgrep \
    zip unzip xz-utils xzdec && \
    # Cleanup
    apt-get autoremove -y && \
    apt-get clean autoclean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN echo "Setup npm, node, yarn" && \
	  # Setup n (Node.js version manager)
    npm install -g n@latest && \
    n 20.18.1 && \
	  node --version && \
    # Setup npm (Node.js package manager)
    npm install -g npm@latest && \
    npm --version && \
    # Setup yarn
    npm install -g yarn@latest --force && \
    yarn --version

# Install act (GitHub Actions local runner. See also https://github.com/nektos/act)
# 'act' doesn't work on devcontainer. It works on local as well as on WSL.
# RUN curl https://raw.githubusercontent.com/nektos/act/master/install.sh | bash

# Switch back to dialog for any ad-hoc use of apt-get
ENV DEBIAN_FRONTEND=dialog

COPY docker-entrypoint.sh /usr/local/bin/

ENTRYPOINT ["docker-entrypoint.sh"]

CMD [ "node" ]
