/* Um Supabase de mentira, so o suficiente para o app rodar o login inteiro.
   O estado fica em window.__SB para o teste mexer no meio do caminho. */
window.__SB = {
  codigo: '123456',
  sessao: null,                 // {user:{id,email}}
  acesso: null,                 // {status, user_id, email}
  progresso: null,              // {state,...}
  enviados: [],                 // o que o app gravou em progress
  rpcs: [],                     // as funcoes chamadas
  otps: [],                     // os pedidos de codigo
  falharRede: false,
  mentora: false,
  publicados: [],      // o que a mesa da mentoria publicou
  onAuth: null
};
(function(){
  function resp(data, error){ return Promise.resolve({data:data===undefined?null:data, error:error||null}); }
  function q(tabela){
    var filtros = {}, alvo = null;
    var api = {
      select:function(){ return api; },
      eq:function(k,v){ filtros[k]=v; return api; },
      or:function(){ return api; },
      in:function(){ return api; },
      lt:function(){ return api; },
      limit:function(){ return api; },
      order:function(){ return api; },
      maybeSingle:function(){
        if(window.__SB.falharRede) return Promise.reject(new Error('Failed to fetch'));
        if(tabela==='access')   return resp(window.__SB.acesso);
        if(tabela==='progress') return resp(window.__SB.progresso);
        if(tabela==='profiles') return resp({is_mentor: !!window.__SB.mentora});
        return resp(null);
      },
      single:function(){ return api.maybeSingle(); },
      then:function(f,r){ // consultas sem maybeSingle
        if(window.__SB.falharRede) return Promise.reject(new Error('Failed to fetch')).then(f,r);
        return resp([]).then(f,r);
      },
      insert:function(v){ window.__SB.publicados.push({t:tabela, v:v}); return resp(v); },
      update:function(v){ return resp(v); },
      delete:function(){ return resp(null); },
      upsert:function(v){
        if(window.__SB.falharRede) return Promise.reject(new Error('Failed to fetch'));
        if(tabela==='progress'){ window.__SB.enviados.push(JSON.parse(JSON.stringify(v))); window.__SB.progresso={state:v.state, atualizado_em:v.atualizado_em}; }
        return resp(v);
      }
    };
    return api;
  }
  var FALSO = {
    createClient: function(){
      return {
        auth: {
          onAuthStateChange: function(cb){ window.__SB.onAuth = cb; return {data:{subscription:{unsubscribe:function(){}}}}; },
          getSession: function(){ return resp({session: window.__SB.sessao}); },
          signInWithOtp: function(o){
            window.__SB.otps.push(o.email);
            if(window.__SB.erroOtp) return resp(null, {message: window.__SB.erroOtp});
            return resp({});
          },
          verifyOtp: function(o){
            if(String(o.token)!==window.__SB.codigo) return resp(null,{message:'Token has expired or is invalid'});
            var u = {id: window.__SB.userId || 'u-ana', email:o.email};
            window.__SB.sessao = {user:u};
            setTimeout(function(){ if(window.__SB.onAuth) window.__SB.onAuth('SIGNED_IN',{user:u}); },10);
            return resp({user:u});
          },
          signOut: function(){ window.__SB.sessao=null; return resp({}); }
        },
        from: q,
        rpc: function(nome,args){
      window.__SB.rpcs.push([nome,args]);
      if(nome==='resumo_admin') return resp(window.__SB.resumo || {ativas:14,pendentes:2,ativas_7d:9,provas:23,provas_7d:4,perguntas:3,denuncias:1,audios:5,aulas:8,encontros:2,xp_medio:1240});
      if(nome==='alunas_admin') return resp(window.__SB.lista || [
        {email:'ana@x.com', nome:'Ana', status:'active', user_id:'u-ana', xp:1200, nivel:4, entrou:new Date().toISOString(), mexeu:new Date(Date.now()-86400000).toISOString()},
        {email:'bia@x.com', nome:'Bia', status:'inactive', user_id:'u-bia', xp:300, nivel:2, entrou:new Date().toISOString(), mexeu:null}
      ]);
      if(nome==='liberar_acesso') return resp('liberado');
      if(nome==='encerrar_acesso') return resp('encerrado');
      return resp(true);
    },
        channel: function(){ return {on:function(){return this;}, subscribe:function(){return this;}}; },
        removeChannel: function(){},
        storage: { from: function(){ return {upload:function(){return resp({})}, getPublicUrl:function(){return {data:{publicUrl:''}}}}; } }
      };
    }
  };
  /* O arquivo do app traz o supabase-js de verdade embutido, e ele grava em
     window.supabase depois deste script. Aqui a propriedade vira so-leitura
     com setter que engole a escrita: o de verdade nao reclama e o de mentira
     continua valendo. */
  Object.defineProperty(window, 'supabase', {
    configurable: false,
    get: function(){ return FALSO; },
    set: function(){ /* o de verdade tenta gravar aqui: ignorado */ }
  });
})();
