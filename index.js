const { BedrockPortal, Joinability, Modules: { AutoFriendAdd, InviteOnMessage } } = require('bedrock-portal');
const { Authflow } = require('prismarine-auth');
const fs = require('fs');
const tx2 = require('tx2');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const authflow = new Authflow('', './authCache/');

const startPortal = async () => {
  const portal = new BedrockPortal(authflow, {
    ip: config.ip,
    port: config.port,
    world: config.world,
    joinability: Joinability[config.joinability],
  });

  const moduleConfigurations = {
    AutoFriendAdd: AutoFriendAdd,
    InviteOnMessage: InviteOnMessage
  };

  Object.keys(moduleConfigurations).forEach(key => {
    if (config.modules[key]) {
      portal.use(moduleConfigurations[key], config.modules[key]);
    }
  });

  const counters = {};
  Object.keys(config.subscribeToEvents).forEach(eventName => {
    counters[eventName] = tx2.counter(`${config.appName} - ${config.subscribeToEvents[eventName]}`);
  });

  Object.entries(config.subscribeToEvents).forEach(([eventName, logMessage]) => {
    portal.on(eventName, (data) => {

      console.log(`${logMessage}:`, data);

      counters[eventName].inc();
    });
  });

  try {
    await portal.start();
    console.log(`${config.appName} started successfully`);
  } catch (error) {
    console.error(`Error starting ${config.appName}:`, error);
    process.exit(1);
  }
};

startPortal();

