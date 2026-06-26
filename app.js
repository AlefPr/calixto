// Referências aos elementos da tela
const inputBusca = document.getElementById('busca-cidade');
const divResultados = document.getElementById('resultados');

// Armazenará os dados vindos do JSON
let dadosCidades = [];

// 1. Carrega o JSON direto da raiz do repositório
fetch('./cidades.json')
  .then(response => {
    if (!response.ok) {
      throw new Error(`Erro HTTP: status ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    dadosCidades = Array.isArray(data) ? data : [];
    console.log("Dados carregados com sucesso!", dadosCidades);
  })
  .catch(error => {
    console.error("Erro ao carregar o arquivo JSON:", error);
    divResultados.innerHTML = `<p class="sem-resultado">Erro ao carregar banco de dados.</p>`;
  });

// 2. Evento de escuta para a busca em tempo real
inputBusca.addEventListener('input', (evento) => {
  const termoDigitado = evento.target.value.toLowerCase().trim();
  
  // Limpa a tela a cada caractere digitado
  divResultados.innerHTML = '';

  // Só pesquisa se o usuário digitar pelo menos 2 letras
  if (termoDigitado.length < 2) return;

  // Filtra usando 'Column1' que é onde está o nome da cidade no seu JSON
  const cidadesFiltradas = dadosCidades.filter(item => {
    return item && 
           item.Column1 && 
           typeof item.Column1 === 'string' && 
           item.Column1.toLowerCase().includes(termoDigitado) &&
           item.Column1.toUpperCase() !== "CIDADE"; // Ignora a linha de cabeçalho se houver
  });

  // Se não encontrar nada
  if (cidadesFiltradas.length === 0) {
    divResultados.innerHTML = '<p class="sem-resultado">Nenhuma cidade encontrada com esse nome.</p>';
    return;
  }

  // 3. Renderiza os cards na tela mapeando suas colunas
  cidadesFiltradas.forEach(cidadeData => {
    
    // Vamos coletar as informações das colunas existentes para exibir no card
    const cidadeNome = cidadeData.Column1;
    const regiaoPOP = cidadeData.Column2 || '';
    
    // Lista para agrupar as informações de planos/serviços que estão nas colunas 4, 5, 7...
    let infoTags = [];
    
    if (cidadeData.Column4) infoTags.push(`<span class="plan-tag">📦 ${cidadeData.Column4}</span>`);
    if (cidadeData.Column5) infoTags.push(`<span class="plan-tag">📦 ${cidadeData.Column5}</span>`);
    if (cidadeData.Column6) infoTags.push(`<span class="plan-tag">📦 ${cidadeData.Column6}</span>`);
    if (cidadeData.Column7) infoTags.push(`<span class="plan-tag">⚙️ ${cidadeData.Column7}</span>`);

    // Monta a estrutura do Card usando os novos campos
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3>📍 ${cidadeNome} ${regiaoPOP ? `(${regiaoPOP})` : ''}</h3>
      <div class="plan-container" style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 8px;">
        ${infoTags.join('') || '<span class="sem-resultado">Sem informações adicionais</span>'}
      </div>
    `;
    
    // Injeta o card na div de resultados
    divResultados.appendChild(card);
  });
});
