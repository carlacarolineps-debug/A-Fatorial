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
  senhas: {},          // email -> senha ja definida
  senhaDefinida: null,
  temporaria: {},      // email -> true enquanto a senha veio por e-mail
  recuperacoes: [],    // os e-mails de "esqueci a minha senha"
  perfil: null,        // a linha de profiles do proprio usuario
  perfis: [],          // o que o app gravou em profiles
  uploads: [],         // o que subiu para o storage
  invocadas: [],       // as Edge Functions chamadas
  erroFuncao: false,   // a Edge Function nao esta publicada
  erroProgress: false,   // simula leitura do progresso que falha
  erroUpdate: null,      // simula o servidor recusando a troca de senha
  statusAcesso: null,    // finge uma resposta ruim do servidor: 429, 503, 401...
  lidasAcesso: 0,        // quantas vezes o app perguntou pelo acesso
  publicados: [],      // o que a mesa da mentoria publicou
  /* listas por tabela, para o teste montar a tela de verdade. Sem isto
     toda consulta de lista voltava vazia, e um teste que nao monta a tela
     nao prova nada: ele passa por ausencia, nao por defesa. */
  tabelas: {},         // {denuncias:[...], membros:[...], galeria:[...]}
  onAuth: null
};
(function(){
  function resp(data, error, status){ return Promise.resolve({data:data===undefined?null:data, error:error||null, status:(status===undefined?200:status)}); }
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
        if(tabela==='access'){
          window.__SB.lidasAcesso++;
          var st = window.__SB.statusAcesso;
          if(st) return resp(null, {message:'erro '+st}, st);
          return resp(window.__SB.acesso);
        }
        if(tabela==='progress'){
          if(window.__SB.erroProgress) return resp(null,{message:'TypeError: Failed to fetch'},0);
          return resp(window.__SB.progresso);
        }
        if(tabela==='profiles'){
          var base = {is_mentor: !!window.__SB.mentora};
          if(window.__SB.perfil) for(var k in window.__SB.perfil) base[k]=window.__SB.perfil[k];
          return resp(base);
        }
        return resp(null);
      },
      single:function(){ return api.maybeSingle(); },
      then:function(f,r){ // consultas sem maybeSingle
        if(window.__SB.falharRede) return Promise.reject(new Error('Failed to fetch')).then(f,r);
        var lista = (window.__SB.tabelas && window.__SB.tabelas[tabela]) || [];
        return resp(lista).then(f,r);
      },
      insert:function(v){ window.__SB.publicados.push({t:tabela, v:v}); return resp(v); },
      /* update tem que ser encadeavel: o app faz .update(...).eq(...), e
         um dube que devolve a resposta direto quebra a cadeia e polui o
         teste com um erro que nao existe no app de verdade */
      update:function(v){
        window.__SB.publicados.push({t:tabela, up:v});
        var enc = { eq:function(){ return enc; }, in:function(){ return enc; },
                    then:function(f,r){ return resp(v).then(f,r); } };
        return enc;
      },
      delete:function(){ return resp(null); },
      upsert:function(v){
        if(window.__SB.falharRede) return Promise.reject(new Error('Failed to fetch'));
        if(tabela==='progress'){ window.__SB.enviados.push(JSON.parse(JSON.stringify(v))); window.__SB.progresso={state:v.state, atualizado_em:v.atualizado_em}; }
        if(tabela==='profiles'){
          window.__SB.perfis.push(JSON.parse(JSON.stringify(v)));
          window.__SB.perfil = window.__SB.perfil || {};
          for(var k in v) window.__SB.perfil[k]=v[k];
        }
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
          signInWithPassword: function(o){
            var mail=String(o.email||'').toLowerCase();
            if(window.__SB.senhas[mail] && window.__SB.senhas[mail]===o.password){
              var u={id: window.__SB.userId || 'u-ana', email:mail,
                     user_metadata:{senha_temporaria: !!window.__SB.temporaria[mail]}};
              window.__SB.sessao={user:u};
              setTimeout(function(){ if(window.__SB.onAuth) window.__SB.onAuth('SIGNED_IN',{user:u}); },10);
              return resp({user:u});
            }
            return resp(null,{message:'Invalid login credentials'});
          },
          updateUser: function(o){
            if(window.__SB.erroUpdate) return resp(null,{message:window.__SB.erroUpdate});
            var mail=(window.__SB.sessao&&window.__SB.sessao.user.email)||'';
            if(o && o.password){
              window.__SB.senhas[mail]=o.password;
              window.__SB.senhaDefinida=o.password;
            }
            var u=(window.__SB.sessao||{}).user||{};
            u.user_metadata=u.user_metadata||{};
            if(o && o.data) for(var k in o.data) u.user_metadata[k]=o.data[k];
            if(o && o.data && o.data.senha_temporaria===false) delete window.__SB.temporaria[mail];
            return resp({user:u});
          },
          resetPasswordForEmail: function(email){
            window.__SB.recuperacoes.push(email);
            if(window.__SB.erroOtp) return resp(null, {message: window.__SB.erroOtp});
            return resp({});
          },
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
      /* o que a TMB mandou: uma que deu certo, uma que a plataforma
         mandou com palavra desconhecida, e uma em que o e-mail nao saiu */
      if(nome==='webhooks_admin') return resp(window.__SB.webhooks || [
        {id:'w1', quando:new Date().toISOString(), origem:'vendas', email:'nova@x.com',
         acao:'acesso liberado e senha enviada', deu_certo:true, erro:null},
        {id:'w2', quando:new Date(Date.now()-3600000).toISOString(), origem:'vendas', email:'duvida@x.com',
         acao:'a TMB mandou o status "Em Conferencia", que o app nao conhece. Ninguem foi liberado nem cortado.',
         deu_certo:false, erro:'a TMB mandou o status "Em Conferencia", que o app nao conhece. Ninguem foi liberado nem cortado.'},
        {id:'w3', quando:new Date(Date.now()-7200000).toISOString(), origem:'senha', email:'sememail@x.com',
         acao:'o acesso foi liberado, mas o e-mail com a senha nao saiu', deu_certo:false,
         erro:'faltam os segredos GMAIL_USER e GMAIL_APP_PASSWORD'}
      ]);
      if(nome==='liberar_acesso') return resp('liberado');
      if(nome==='encerrar_acesso') return resp('encerrado');
      return resp(true);
    },
        channel: function(){ return {on:function(){return this;}, subscribe:function(){return this;}}; },
        removeChannel: function(){},
        storage: { from: function(balde){ return {
          upload:function(caminho,arquivo){
            if(window.__SB.erroUpload) return resp(null,{message:'nao deu'});
            window.__SB.uploads.push({balde:balde, caminho:caminho});
            return resp({path:caminho});
          },
          getPublicUrl:function(caminho){ return {data:{publicUrl:'https://exemplo.test/'+balde+'/'+caminho}}; }
        }; } },
        functions: { invoke: function(nome, opts){
          window.__SB.invocadas.push({nome:nome, body:(opts&&opts.body)||null});
          if(window.__SB.erroFuncao) return resp(null,{message:'Function not found'});
          var mail=String(((opts&&opts.body)||{}).email||'').toLowerCase();
          window.__SB.senhas[mail]='temp1234ab';
          window.__SB.temporaria[mail]=true;
          return resp({ok:true, email:mail, nova:true});
        } }
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
