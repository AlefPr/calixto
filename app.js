// Referências aos elementos da tela
const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');

// Armazenará os dados vindos do JSON
let dadosCidades = [];

// 1. Carrega o JSON direto da raiz do repositório
// Ajuste para './cidades.json' se você já renomeou o arquivo no GitHub
fetch('./cidades.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Erro HTTP: status ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    // Garante que estamos lidando com uma lista/array
    dadosCidades = Array.isArray(data) ? data : [];
    console.log("Dados carregados com sucesso!", dadosCidades);
  })
  .catch(error => {
    console.error("Erro ao carregar o arquivo JSON:", error);
    divResultados.innerHTML = `<p class="sem-resultado">Erro ao carregar banco de dados. Verifique o nome do arquivo JSON.</p>`;
  });

// 2. Evento de escuta para a busca em tempo real
inputBusca.addEventListener('input', (evento) => {
  const termoDigitado = evento.target.value.toLowerCase().trim();
  
  // Limpa a tela a cada caractere digitado
  divResultados.innerHTML = '';

  // Só pesquisa se o usuário digitar pelo menos 2 letras
  if (termoDigitado.length < 2) return;

  // Filtra blindando contra registros nulos, vazios ou sem a propriedade 'cidade'
  const cidadesFiltradas = dadosCidades.filter(item => {
    return item && 
           item.cidade && 
           typeof item.cidade === 'string' && 
           item.cidade.toLowerCase().includes(termoDigitado);
  });

  // Se não encontrar nada
  if (cidadesFiltradas.length === 0) {
    divResultados.innerHTML = '<p class="sem-resultado">Nenhuma cidade encontrada com esse nome.</p>';
    return;
  }

  // 3. Renderiza os cards na tela
  cidadesFiltradas.forEach(cidadeData => {
    // Trata os planos caso existam no objeto
    let planosHtml = '';
    if (cidadeData.planos && Array.isArray(cidadeData.planos)) {
      planosHtml = cidadeData.planos.map(plano => {
        const nomePlano = plano.nome || 'Plano Sem Nome';
        const valorPlano = plano.valor ? `R$ ${Number(plano.valor).toFixed(2)}` : 'Consulte';
        return `<span class="plan-tag">📦 ${nomePlano} - ${valorPlano}</span>`;
      }).join('');
    }

    // Trata os serviços adicionais caso existam
    const servicos = (cidadeData.servicos_adicionais && Array.isArray(cidadeData.servicos_adicionais)) 
      ? cidadeData.servicos_adicionais.join(', ') 
      : 'Nenhum serviço adicional cadastrado';

    // Monta a estrutura do Card
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>📍 ${cidadeData.cidade} ${cidadeData.estado ? `- ${cidadeData.estado}` : ''}</h3>
      <p><strong>Serviços Disponíveis:</strong> ${servicos}</p>
      <div class="plan-container">
        ${planosHtml || '<span class="sem-resultado">Nenhum plano disponível</span>'}
      </div>
    `;
    
    // Injeta o card na div de resultados
    divResultados.appendChild(card);
  });
});
