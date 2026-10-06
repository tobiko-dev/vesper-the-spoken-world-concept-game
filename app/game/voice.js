import {parseIncantation} from './rules.js';
import {identifySpell,castingHelp} from './casting-help.js';
export class VoiceCaster {
 constructor(getEngine,onState,onResult){this.getEngine=getEngine;this.onState=onState;this.onResult=onResult;this.active=false;this.text='';this.disposed=false;}
 supported(){return typeof window!=='undefined'&&!!(window.SpeechRecognition||window.webkitSpeechRecognition);}
 start(){if(this.active){this.stop();return;}const engine=this.getEngine();if(!engine||!engine.playing||engine.paused)return;if(!this.supported()){this.onState({active:false,text:'',error:'Voice recognition is unavailable in this browser. Use the assisted hotbar, or open the game in a browser with speech recognition.'});return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;this.recognition=new Recognition();const r=this.recognition;r.lang='en-US';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;this.text='';this.finalText='';this.completed=false;this.error=false;
  r.onstart=()=>{this.active=true;this.onState({active:true,text:'',error:''});};
  r.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)this.finalText+=e.results[i][0].transcript+' ';else interim+=e.results[i][0].transcript;}this.text=(this.finalText+interim).trim();this.onState({active:true,text:this.text,error:''});const parsed=parseIncantation(this.text,engine.state.learned,false);if(parsed.ok&&!this.completed){this.completed=true;const result=engine.cast(parsed.spell,'voice');this.onResult({parsed,result,text:this.text});r.stop();}};
  r.onerror=e=>{this.error=true;const messages={'not-allowed':'Microphone access was denied. Allow it in your browser’s site settings, then try again.','service-not-allowed':'This browser’s speech service is unavailable here. The assisted hotbar still works.','audio-capture':'No microphone was found. Connect one or use the assisted hotbar.','network':'The speech service could not connect. Try again, or use the assisted hotbar.','no-speech':'No speech was heard. Press V and try a complete invocation.','aborted':''};this.onState({active:false,text:this.text,error:messages[e.error]||'Voice recognition stopped. Press V to try again.'});this.active=false;};
  r.onend=()=>{this.active=false;clearTimeout(this.timeout);if(this.disposed)return;if(!this.completed&&!this.error){const parsed=parseIncantation(this.text,engine.state.learned,false);const reason=this.text?parsed.reason:'No invocation heard. Press V to begin again.';const id=parsed.spell||identifySpell(this.text);engine.cb.onCastHelp?.(castingHelp(id,reason));this.onState({active:false,text:this.text,error:reason});}else if(!this.error)this.onState({active:false,text:this.text,error:''});};
  try{r.start();this.timeout=setTimeout(()=>this.stop(),25000);}catch{this.onState({active:false,text:'',error:'The microphone could not start. Try again, or use an assisted cast.'});}
 }
 stop(){clearTimeout(this.timeout);try{this.recognition?.stop();}catch{}this.active=false;}
 cancel(){clearTimeout(this.timeout);this.disposed=true;try{this.recognition?.abort();}catch{}this.active=false;}
}
