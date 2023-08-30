const { Client, GatewayIntentBits } = require('discord.js')
require('dotenv/config')
const {fetch} = require('undici')
const PUUID="pneU6bUTxo-WXRvm5cODPgQJORFaTYAjM72KWlIDOPf-XtCSLHArWYUJSDzdNJjfWQTjs3KzYDSA3g"

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
})

client.on('ready',()=>{

    console.log("bot listo");

})

client.on('messageCreate', async message =>{
    if(message.content.match("!ultimoGame")){
        const response = await getLastMatchResultByName(message.content.slice(11));
        message.reply(response)
    }
})
const getPuuidByName = async(name)=>{
    const response = await fetch(`https://la2.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}?api_key=${process.env.API_KEY}`);
    const data = await response.json();
    return data.puuid;
}
const getMatchesList = async(puuid)=>{
    const link = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?api_key=${process.env.API_KEY}&start=0&count=10`;
    const response = await fetch(link);
    return await response.json();
}

const getLastMatchResultByName = async(nombre)=>{
    const puuid = await getPuuidByName(nombre)
    const matches =await getMatchesList(puuid);
    const id = matches[0];
    const response = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${process.env.API_KEY}`);
    const data = await response.json();
    //obtengo el indice del jugador para buscarlo en la lista de participantes en el objeto info para saber si gano o perdio
    const indexOfPlayer = data.metadata.participants.indexOf(puuid);
    //esto me devuevle true si gano y false si perdio
    const win =data.info.participants[indexOfPlayer].win;
    return win?"carriaste hard":"te fuiste gapeado bro";

}

client.login(process.env.TOKEN);