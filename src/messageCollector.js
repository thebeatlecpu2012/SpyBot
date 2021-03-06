"use strict";

const fs = require("fs");
const csvStringify = require("csv-stringify");

module.exports.getAllMessagesInChannels = getAllMessagesInChannels;

function getAllMessagesInChannels(channels) {
  return new Promise(async resolve => {
    console.log("Started loading");

    const file = fs.createWriteStream(__dirname + "/data_files/msgs.csv");
    const csvHeaders = [["Timestamp", "Author", "Channel", "Content"]];

    csvStringify(csvHeaders, (err, output) => {
      if (err) reject(err);

      file.write(output);
    });

    const result = await Promise.all(channels.map(channel => getAllMessagesInChannel(channel, file)));
    const totalNumOfMsgs = result.reduce((a, b) => a + b.numOfMsgs, 0);

    console.log(`Finished loading a total of ${totalNumOfMsgs} messages from ${channels[0].guild.name}`);

    file.end();

    resolve(result);
  });
}

function getAllMessagesInChannel(channel, file) {
  return new Promise(async resolve => {
    const firstMessage = (await channel.getMessages(1))[0];

    let id = firstMessage.id;
    let numOfMsgs = 0;
    let channelHasMoreMessages = true;

    let promises = [];

    while (channelHasMoreMessages) {
      const msgs = await channel.getMessages(100, id);

      await saveMessagesInFile(msgs, file);

      numOfMsgs += msgs.length;

      if (msgs.length < 50) {
        channelHasMoreMessages = false;
        continue;
      }

      id = msgs[msgs.length - 1].id;

      promises.push(new Promise(resolve => resolve()));
    }
  
    await Promise.all(promises);

    console.log(`Loaded ${numOfMsgs} messages from #${channel.name}`);

    resolve({
      name: channel.name,
      numOfMsgs
    });
  });
}

async function saveMessagesInFile(msgs, file) {
  let promises = [];

  msgs.forEach(m => {
    const input = [[m.timestamp, m.author.username, m.channel.name, m.content]];

    promises.push(new Promise((resolve, reject) => {
      csvStringify(input, (err, output) => {
        if (err) reject(err);
  
        resolve(file.write(output));
      });
    }));
  });

  return Promise.all(promises);
}