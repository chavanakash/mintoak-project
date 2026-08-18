FROM jenkins/jenkins:lts-jdk17

# Running as root deliberately: this container builds Docker images via the
# host's mounted socket, and on Docker Desktop for Mac the socket's group
# ownership doesn't reliably map into the container's `jenkins` user. Root
# sidesteps that permission friction. Fine for a local learning cluster --
# never do this for a Jenkins instance anyone else can reach.
USER root

RUN apt-get update \
  && apt-get install -y --no-install-recommends docker.io git \
  && rm -rf /var/lib/apt/lists/*

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

COPY casc/jenkins.yaml /var/jenkins_home/casc_configs/jenkins.yaml
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc_configs/jenkins.yaml
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
