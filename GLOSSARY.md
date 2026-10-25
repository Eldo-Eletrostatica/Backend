# Eldo Eletrostática

Site institucional e gestão interna de uma empresa de pintura eletrostática: vitrine pública, pedidos (do contato à OS), estoque e vendas. Cada termo abaixo é o nome em inglês usado no código, com o termo do negócio entre parênteses.

## Language

### Clientes e atendimento

**Customer** (cliente):
Pessoa física ou jurídica que contrata um serviço de pintura, identificada pelo CPF ou pelo CNPJ. O cliente PF que só enviou o formulário de contato pode ficar sem CPF.
_Avoid_: client, user

**IndividualCustomer** (cliente PF):
Cliente pessoa física, atendido por WhatsApp.
_Avoid_: person, pf

**BusinessCustomer** (cliente PJ):
Cliente pessoa jurídica, identificado pelo CNPJ e atendido por e-mail.
_Avoid_: company, corporate, pj

**ContactRequest** (solicitação de contato):
Mensagem que o cliente PF envia pelo formulário de contato para ser atendido por uma pessoa pelo WhatsApp. É um pedido com origem `contact`: começa como `requested` e segue as etapas do pedido se virar negócio.
_Avoid_: lead, message

**Review** (avaliação):
Avaliação pública da empresa no Google, exibida no site. Quando uma OS é concluída, o cliente recebe o link para avaliar a Eldo no Google.
_Avoid_: testimonial, feedback, rating

### Pedido

**Order** (pedido):
Registro único que acompanha um negócio do primeiro contato à entrega: solicitação de contato, orçamento, venda e OS são etapas dele, marcadas pelo status. A origem diz como ele nasceu: `contact` (formulário de contato), `pdf` (upload de PDF), `estimator` (simulador) ou `internal` (cadastrado pela equipe).
_Avoid_: request, job, deal

**OrderStatus** (status do pedido):
Etapa do pedido. As do orçamento: `requested` (pedido pelo cliente), `sent` (a Eldo enviou o valor), `approved` (aprovado) ou `rejected` (recusado). As da OS, depois da venda: `queued` (em fila), `inProduction` (em produção), `finishing` (em finalização) ou `completed` (concluído).
_Avoid_: state, phase

**Quote** (orçamento):
Etapa do pedido em que o cliente pede um preço e a Eldo responde, do status `requested` ao `approved` ou `rejected`. Nasce pelo upload de PDF ou pelo simulador.
_Avoid_: budget (em inglês, budget é a verba disponível de alguém, outro sentido), quote request, inquiry

**OrderItem** (item do pedido):
Uma peça do pedido: material da peça, tipo de pintura, área em m² de cada peça e quantidade. Guarda o preço por m² e o fator usados no cálculo, que não mudam se o catálogo de preços mudar depois.
_Avoid_: line, product, quote item

**QuoteEstimator** (simulador de orçamento):
Ferramenta opcional que calcula uma faixa de preço a partir do tipo de pintura, do material da peça e da área; o administrador pode desativá-la.
_Avoid_: calculator, simulator

**PriceRange** (faixa de preço):
Resultado do simulador: vai do preço calculado até o preço calculado mais a margem de negociação, nunca um valor único.
_Avoid_: estimate, price

**PricingRule** (regra de cálculo):
O conjunto de valores que o administrador configura para o simulador: o preço por m² de cada tipo de pintura, o fator de cada material e a margem de negociação.
_Avoid_: price table, rate

**NegotiationMargin** (margem de negociação):
Percentual que define o topo da faixa de preço, deixando espaço para a Eldo dar desconto.
_Avoid_: markup, discount

**CatalogItem** (item do catálogo de preços):
Tipo de pintura ou material da peça, com o valor que o simulador usa no cálculo. O administrador pode desativar um item que a Eldo deixou de oferecer.
_Avoid_: product, price table

**PaintType** (tipo de pintura):
Item do catálogo com tipo `paintType`: tinta ou acabamento oferecido pela empresa, como epóxi ou poliéster, com um preço por m². É o que a Eldo vende, independente da tinta física guardada no estoque (InventoryItem).
_Avoid_: coating, finish

**PartMaterial** (material da peça):
Item do catálogo com tipo `partMaterial`: material da peça que o cliente quer pintar, como aço ou alumínio, com um fator que multiplica o preço por m² da tinta (aço 1,0; alumínio 1,2).
_Avoid_: material (sozinho, confunde com os materiais de estoque)

### Serviço

**ServiceOrder** (ordem de serviço, OS):
Etapa do pedido depois da venda: o serviço em produção, acompanhado da fila até a entrega, que guarda a data de conclusão quando termina. Entre os status da OS (`queued`, `inProduction`, `finishing` e `completed`), a etapa muda livremente, em qualquer ordem.
_Avoid_: job, project

**TrackingCode** (protocolo):
Código aleatório e não adivinhável que o cliente recebe quando a venda é lançada e usa para consultar sua OS sem login. A consulta pública também aceita o CNPJ do cliente; por CNPJ, ela mostra só a etapa e o prazo de cada OS em andamento.
_Avoid_: protocol, ticket

### Vitrine

**ShowcaseItem** (item da vitrine):
Conteúdo exibido na vitrine do site: um projeto do portfólio (tipo `portfolioProject`) ou um evento (tipo `companyEvent`).
_Avoid_: post, content, cms

**PortfolioCategory** (categoria do portfólio):
Texto que agrupa projetos do portfólio e vira um filtro da galeria, em ordem alfabética.
_Avoid_: tag, section, category (sozinho, confunde com a categoria de estoque)

**PortfolioProject** (projeto do portfólio):
Trabalho já realizado exibido na vitrine: imagem de capa obrigatória, categoria, fotos de antes e depois opcionais, e tipo de serviço e materiais descritos em texto livre.
_Avoid_: work, job, project (sozinho)

**CompanyEvent** (evento):
Ação ou evento de que a empresa participou, com a data em que aconteceu, descrição e uma imagem. A linha do tempo do site segue a data do evento.
_Avoid_: event (sozinho, colide com os eventos do DOM e do Node)

### Configuração do site

**VisualSettings** (configuração visual):
Cores do tema, logotipo, banner e textos da página inicial. Tem a versão publicada, que o site mostra, e um rascunho que o administrador edita e pré-visualiza antes de publicar. O rascunho pode ser descartado, voltando a ser igual à versão publicada. Restaurar o padrão volta as duas versões à identidade visual original, e o site muda na hora.
_Avoid_: theme (sozinho), layout

**Banner** (banner):
Bloco do topo da página inicial, com chamada, título, texto em destaque, descrição e imagem.
_Avoid_: hero, destaque

### Gestão interna

**Employee** (funcionário):
Pessoa da empresa com acesso à área interna.
_Avoid_: staff, worker

**Role** (nível de acesso):
Nível de permissão de um funcionário: `admin` (administrador), `manager` (gestor) ou `employee` (funcionário).
_Avoid_: permission level, profile

**InventoryItem** (item de estoque):
Tinta, insumo ou material controlado no estoque, com saldo, estoque mínimo, unidade de medida (kg, litro ou unidade), categoria e fornecedor.
_Avoid_: product, stock item

**InventoryCategory** (categoria de estoque):
Texto que agrupa itens de estoque (ex.: tintas, insumos), digitado no cadastro do item.
_Avoid_: category (sozinho, confunde com a categoria do portfólio)

**StockMovement** (movimentação de estoque):
Entrada (`inbound`) ou saída (`outbound`) de um item de estoque, com quantidade, data, motivo e funcionário. Atualiza o saldo do item e não se liga a nenhuma OS.

**MinimumStock** (estoque mínimo):
Quantidade de referência de um item de estoque. Com o saldo igual ou abaixo dela, o item aparece em alerta até ser reposto.
_Avoid_: transaction

**Supplier** (fornecedor):
Empresa que fornece um item de estoque, registrada só pelo nome no próprio item.
_Avoid_: vendor, provider

**Sale** (venda):
Fechamento de negócio com um cliente, normalmente a partir de um orçamento aprovado. É o lançamento que leva o pedido para a etapa de OS e guarda a comissão calculada naquele momento, que não muda se a regra mudar depois.

**Seller** (vendedor):
Funcionário responsável por uma venda e que recebe a comissão dela. É escolhido no lançamento e vem preenchido com quem está lançando.
_Avoid_: salesperson, salesman, vendor

**CommissionRule** (regra de comissão):
Percentual ou valor fixo de comissão de um funcionário, guardado no cadastro dele. Cada funcionário tem no máximo uma regra.
_Avoid_: bonus, fee

**Statistics** (análises estatísticas):
Indicadores dos pedidos de um período que o gestor vê no dashboard: volume de orçamentos, taxa de conversão e tipos de pintura mais pedidos. O volume e a taxa contam só orçamentos; o ranking de tipos de pintura conta todos os pedidos do período, de qualquer origem e status, porque mede a procura por cada pintura. São calculados na hora a partir de `orders` e `order_items`, sem tabela própria.
_Avoid_: analytics, metrics, dashboard (o dashboard é a tela do Frontend)

**ConversionRate** (taxa de conversão):
Dos orçamentos criados no período, a fração que já virou venda, mesmo que a venda tenha sido fechada depois do período. Vai de 0 a 1 e fica vazia quando o período não tem orçamentos.
_Avoid_: close rate, success rate

**StatisticsReport** (relatório estatístico):
Arquivo com as análises estatísticas de um período, para o gestor levar a reuniões: PDF com gráfico ou planilha XLSX. Traz os mesmos números do dashboard e não é gerado para um período sem dados.
_Avoid_: export (é a ação, não o arquivo), dashboard

**CommissionReport** (relatório de comissões):
Consolidação do total de vendas e comissões apuradas por funcionário em um determinado período, utilizada pela gestão para conferência e processamento de pagamentos.
_Avoid_: commission statement, payment report

**SalesRanking** (ranking de vendas):
Classificação dos funcionários ordenada por valor ou volume de vendas realizadas em um determinado período, utilizada pela gestão para acompanhamento de desempenho e incentivo comercial.
_Avoid_: leaderboard, sales contest

**ReportExport** (exportação de relatório):
Arquivo gerado no formato de planilha a partir dos dados do relatório ou do ranking exibidos na tela, para download imediato.
_Avoid_: report download, data dump
