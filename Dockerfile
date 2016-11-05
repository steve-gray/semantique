FROM        node:7
MAINTAINER  steve@eventualconsistency.net

WORKDIR     /app

ADD         node_modules    /app/
ADD         lib             /app/lib/
ADD         package.json    /app
RUN         npm install git-credential-env
RUN         git config --global credential.helper "$PWD/node_modules/.bin/git-credential-env --username=GIT_USER --password=GIT_PASS"
RUN         git config --global user.name steve-gray
RUN         git config --global user.email steve@eventualconsistency.net
CMD         ["node", "index"]
