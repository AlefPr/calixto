const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');
const botoesFiltro = document.querySelectorAll('.filter-btn');

let bancosDeDadosCidades = {};
let filtroAtivo = 'todos'; // todos, internet, combo

// 1. Carregamento e Estruturação de Dados
fetch('./cidades.json')
  .then(response => response.json())
  .then(data => {
    let cidadeAtual = "";
    let popAtual = "";

    data.forEach(item => {
      if (!item || item.Column1 === "CIDADE") return;

      if (item.Column1 && typeof item.Column1 === 'string' && item.Column1.trim() !== "") {
        cidadeAtual = item.Column1.trim().toUpperCase();
        popAtual = item.Column2 ? item.Column2.trim() : cidadeAtual;
        
        if (!bancosDeDadosCidades[cidadeAtual]) {
          bancosDeDadosCidades[cidadeAtual] = { cidade: cidadeAtual, pop: popAtual, planos: [], taxas: [] };
        }
      }

      if (cidadeAtual) {
        if (item.Column4 && item.Column4.trim() !== "") bancosDeDadosCidades[cidadeAtual].planos.push(item.Column4.trim());
        if (item.Column5 && item.Column5.trim() !== "") bancosDeDadosCidades[cidadeAtual].planos.push(item.Column5.trim());
        
        if (item.Column7 && item.Column7.trim() !== "") {
          const nomeTaxa = item.Column7.trim();
          const valorTaxa = item.Column8 !== undefined ? item.Column8 : '';
          bancosDeDadosCidades[cidadeAtual].taxas.push({ nome: nomeTaxa, valor: valorTaxa });
        }
      }
    });
  })
  .catch(error => console.error("Erro ao carregar banco:", error));

// 2. Inteligência de Padronização de Nomes
function formatarNomeServico(nome) {
  let n = nome.toLowerCase().trim();
  // Padronização forçada para garantir consistência visual
  if (n === 'sky/paramout' || n === 'sky/paramount') return 'Sky/Paramount';
  if (n === '01rot.' || n === '1rot.' || n === '01 rot.') return 'Rota 1';
  if (n === '02rot.' || n === '2rot.' || n === '02 rot.') return 'Rota 2';
  if (n === 'deezer') return 'Deezer';
  if (n === 'max') return 'Max';
  // Fallback: Capitaliza a primeira letra
  return n.charAt(0).toUpperCase() + n.slice(1);
}

// 3. Inteligência de Parsing
function interpretarPlano(textoPlano) {
  const partes = textoPlano.split('-');
  const precoOriginal = partes.length > 1 ? partes.pop().trim() : 'Consulte';
  const descricao = partes.join('-').trim();
  
  const precoLimpo = precoOriginal.replace(/R\$\s*R\$/g, 'R$').replace(/R\$\s*/g, 'R$ ');

  const itensRaw = descricao.split('+').map(i => i.trim()).filter(i => i !== "");
  
  let velocidade = itensRaw.shift() || "N/A";
  velocidade = velocidade.replace("Gbps Mbps", "Gbps").replace(/ /g, '');

  // Aplica o corretor visual em cada tag
  const servicosFormatados = itensRaw.map(formatarNomeServico);

  const temStreaming = servicosFormatados.some(i => i.includes('Deezer') || i.includes('Max') || i.includes('Sky'));
  const categoria = temStreaming ? 'combo' : 'internet';

  return { velocidade, servicos: servicosFormatados, preco: precoLimpo, categoria };
}

// 4. Controle dos Filtros
botoesFiltro.forEach(btn => {
  btn.addEventListener('click', (e) => {
    botoesFiltro.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    filtroAtivo = e.target.getAttribute('data-filter');
    renderizarBusca();
  });
});

inputBusca.addEventListener('input', renderizarBusca);

// 5. Renderização do Layout NOC
function renderizarBusca() {
  const termoDigitado = inputBusca.value.toLowerCase().trim();
  divResultados.innerHTML = '';
  if (termoDigitado.length < 2) return;

  const chavesFiltradas = Object.keys(bancosDeDadosCidades).filter(nome => nome.toLowerCase().includes(termoDigitado));
  if (chavesFiltradas.length === 0) return;

  chavesFiltradas.forEach(chave => {
    const dados = bancosDeDadosCidades[chave];
    const planosUnicos = [...new Set(dados.planos)];
    
    // Remove duplicatas de taxas baseadas no nome
    const taxasUnicas = dados.taxas.filter((taxa, index, self) =>
      index === self.findIndex((t) => t.nome === taxa.nome)
    );

    const planosProcessados = planosUnicos.map(interpretarPlano);
    const planosFiltrados = planosProcessados.filter(p => filtroAtivo === 'todos' || p.categoria === filtroAtivo);

    const linhasPlanosHtml = planosFiltrados.map(plano => {
      const badgesServicos = plano.servicos.map(s => `<span class="service-tag">${s}</span>`).join('');
      return `
        <div class="plan-row">
          <div class="p-speed">${plano.velocidade}</div>
          <div class="p-services">${badgesServicos || '<span style="opacity: 0.5">Link Limpo</span>'}</div>
          <div class="p-price">${plano.preco}</div>
        </div>
      `;
    }).join('');

    const taxasHtml = taxasUnicas.map(taxa => {
      // Formata o valor da taxa se existir
      let displayValor = '';
      if (taxa.valor !== '') {
        // Se já for uma string com 'R$', mantém, senão formata o número
        if (isNaN(taxa.valor)) {
          displayValor = `<span class="tax-price">- ${taxa.valor}</span>`;
        } else {
          displayValor = `<span class="tax-price">- R$ ${Number(taxa.valor).toFixed(2).replace('.', ',')}</span>`;
        }
      }
      return `<div class="tax-tag"><i class="ph ph-receipt"></i> ${taxa.nome} ${displayValor}</div>`;
    }).join('');

    const totalPlanos = planosProcessados.length;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <h3><i class="ph ph-map-pin"></i> ${dados.cidade}</h3>
        <span class="pop-subtitle"><i class="ph ph-share-network"></i> POP: ${dados.pop}</span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-box"><span class="kpi-title">Status Infra</span><span class="kpi-value status-ok"><i class="ph ph-check-circle"></i> Operacional</span></div>
        <div class="kpi-box"><span class="kpi-title">Tecnologia</span><span class="kpi-value"><i class="ph ph-broadcast"></i> GPON / Metro</span></div>
        <div class="kpi-box"><span class="kpi-title">Planos Catalogados</span><span class="kpi-value"><i class="ph ph-list-numbers"></i> ${totalPlanos} listados</span></div>
      </div>

      <div class="section-title"><i class="ph ph-package"></i> Matriz de Planos (${filtroAtivo})</div>
      <div style="background: var(--bg-kpi); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 25px; overflow: hidden;">
        ${linhasPlanosHtml || '<div style="padding: 15px; color: var(--text-muted); text-align: center;">Nenhum plano para o filtro selecionado.</div>'}
      </div>

      <div class="section-title"><i class="ph ph-wrench"></i> Taxas e Serviços Operacionais</div>
      <div class="tax-grid">${taxasHtml || '<span style="color: var(--text-muted); font-size: 13px;">Nenhuma taxa cadastrada.</span>'}</div>
    `;
    
    divResultados.appendChild(card);
  });
}
