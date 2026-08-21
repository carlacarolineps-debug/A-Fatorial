/* Ler o PIXEL que foi pintado, e nao o CSS que se supoe que pinta.

   Toda conta de contraste feita a partir de background-color mente quando
   o fundo e gradiente: o botao de ouro devolve "transparente" e reprova,
   e um anel devolve a parada mais escura do degrade e reprova tambem, com
   a tela perfeita. A unica resposta que nao discute e a cor que chegou na
   tela.

   Nao ha decodificador de PNG neste ambiente, entao vai um minimo aqui:
   PNG e assinatura, cabecalho, e os pedacos IDAT concatenados e inflados,
   com um byte de filtro por linha. So o que este arquivo precisa: 8 bits
   por canal, RGB ou RGBA, sem entrelacamento, que e o que o Chromium
   produz. */
const zlib = require('zlib');

function lePNG(buf){
  if(buf.readUInt32BE(0)!==0x89504e47) throw new Error('nao e PNG');
  let i=8, largura=0, altura=0, prof=0, tipo=0, entrelacado=0;
  const pedacos=[];
  while(i < buf.length){
    const tam=buf.readUInt32BE(i), nome=buf.toString('ascii', i+4, i+8);
    const dados=buf.subarray(i+8, i+8+tam);
    if(nome==='IHDR'){
      largura=dados.readUInt32BE(0); altura=dados.readUInt32BE(4);
      prof=dados[8]; tipo=dados[9]; entrelacado=dados[12];
    } else if(nome==='IDAT') pedacos.push(dados);
    else if(nome==='IEND') break;
    i += 12 + tam;
  }
  if(prof!==8) throw new Error('so 8 bits por canal, veio '+prof);
  if(entrelacado) throw new Error('entrelacado nao suportado');
  const canais = tipo===6 ? 4 : tipo===2 ? 3 : (()=>{throw new Error('tipo '+tipo)})();
  const cru = zlib.inflateSync(Buffer.concat(pedacos));
  const passo = largura*canais;
  const saida = Buffer.alloc(altura*passo);
  let p=0;
  for(let y=0; y<altura; y++){
    const filtro = cru[p++];
    const linha = cru.subarray(p, p+passo); p += passo;
    const dest = saida.subarray(y*passo, (y+1)*passo);
    const cima = y ? saida.subarray((y-1)*passo, y*passo) : null;
    for(let x=0; x<passo; x++){
      const a = x>=canais ? dest[x-canais] : 0;
      const b = cima ? cima[x] : 0;
      const c = (cima && x>=canais) ? cima[x-canais] : 0;
      let v = linha[x];
      if(filtro===1) v += a;
      else if(filtro===2) v += b;
      else if(filtro===3) v += (a+b)>>1;
      else if(filtro===4){
        const pa=Math.abs(b-c), pb=Math.abs(a-c), pc=Math.abs(a+b-2*c);
        v += (pa<=pb && pa<=pc) ? a : (pb<=pc ? b : c);
      }
      dest[x] = v & 255;
    }
  }
  return {largura, altura, canais, dados:saida};
}

function pixel(img, x, y){
  const k = (y*img.largura + x)*img.canais;
  return [img.dados[k], img.dados[k+1], img.dados[k+2]];
}

/* a cor que mais aparece na regiao: num botao e o preenchimento, e nao a
   letra, que ocupa pouca area */
function corDominante(img){
  const conta=new Map();
  for(let y=0; y<img.altura; y++) for(let x=0; x<img.largura; x++){
    const [r,g,b]=pixel(img,x,y);
    const k=(r>>2)+','+(g>>2)+','+(b>>2);
    const e=conta.get(k)||{n:0,r:0,g:0,b:0};
    e.n++; e.r+=r; e.g+=g; e.b+=b; conta.set(k,e);
  }
  let melhor=null;
  for(const e of conta.values()) if(!melhor||e.n>melhor.n) melhor=e;
  return [Math.round(melhor.r/melhor.n), Math.round(melhor.g/melhor.n), Math.round(melhor.b/melhor.n)];
}

function lum(m){
  const f=x=>{x/=255;return x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4);};
  return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2]);
}
function razao(a,b){ const A=lum(a),B=lum(b); return (Math.max(A,B)+0.05)/(Math.min(A,B)+0.05); }

module.exports = {lePNG, pixel, corDominante, lum, razao};
