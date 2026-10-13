# Eldo Eletrostática

Site institucional e gestão interna de uma empresa de pintura eletrostática: vitrine pública, orçamentos, ordens de serviço, estoque e vendas. Cada termo abaixo é o nome em inglês usado no código, com o termo do negócio entre parênteses.

## Language

### Clientes e atendimento

**Customer** (cliente):
Pessoa física ou jurídica que contrata um serviço de pintura, identificada pelo CPF ou pelo CNPJ.
_Avoid_: client, user

**IndividualCustomer** (cliente PF):
Cliente pessoa física, atendido por WhatsApp.
_Avoid_: person, pf

**BusinessCustomer** (cliente PJ):
Cliente pessoa jurídica, identificado pelo CNPJ e atendido por e-mail.
_Avoid_: company, corporate, pj

**ContactRequest** (solicitação de contato):
Mensagem que o cliente PF envia pelo formulário de contato para ser atendido por uma pessoa pelo WhatsApp. Fica registrada com o status `new` (novo) ou `handled` (atendido) e pode virar um cliente ou não.
_Avoid_: lead, message

**Review** (avaliação):
Avaliação pública da empresa no Google, exibida no site. Quando uma OS é concluída, o cliente recebe o link para avaliar a Eldo no Google.
_Avoid_: testimonial, feedback, rating

### Orçamento

**Quote** (orçamento):
Pedido de preço de um cliente e a resposta da Eldo, num mesmo registro que avança de status. Nasce pelo upload de PDF ou pelo simulador.
_Avoid_: budget (em inglês, budget é a verba disponível de alguém, outro sentido), quote request, inquiry

**QuoteStatus** (status do orçamento):
Etapa do orçamento: `requested` (pedido pelo cliente), `sent` (a Eldo enviou o valor), `approved` (aprovado) ou `rejected` (recusado).
_Avoid_: state, phase

**QuoteItem** (item do orçamento):
Uma peça do pedido: material da peça, tipo de pintura, área em m² de cada peça e quantidade. Guarda o preço por m² e o fator usados no cálculo, que não mudam se a tabela de preços mudar depois.
_Avoid_: line, product

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

**PaintType** (tipo de pintura):
Tinta ou acabamento oferecido pela empresa, como epóxi ou poliéster, com um preço por m². O administrador pode desativar um tipo que a Eldo deixou de oferecer. É o que a Eldo vende, independente da tinta física guardada no estoque (InventoryItem).
_Avoid_: coating, finish

**PartMaterial** (material da peça):
Material da peça que o cliente quer pintar, como aço ou alumínio, com um fator que multiplica o preço por m² da tinta (aço 1,0; alumínio 1,2).
_Avoid_: material (sozinho, confunde com os materiais de estoque)

### Serviço

**ServiceOrder** (ordem de serviço, OS):
Um serviço em produção, acompanhado da fila até a entrega, que guarda a data de conclusão quando termina. Cada venda gera uma OS, e uma OS também pode ser cadastrada sem venda, para um serviço combinado por fora.
_Avoid_: job, order, project

**ServiceOrderStatus** (status da OS):
Etapa da OS: `queued` (em fila), `inProduction` (em produção), `finishing` (em finalização) ou `completed` (concluído). A etapa muda livremente, em qualquer ordem.
_Avoid_: state, phase

**TrackingCode** (protocolo):
Código aleatório e não adivinhável que o cliente recebe quando a OS é criada e usa para consultar sua OS sem login. A consulta pública também aceita o CNPJ do cliente; por CNPJ, ela mostra só a etapa e o prazo de cada OS em andamento.
_Avoid_: protocol, ticket

### Vitrine

**PortfolioCategory** (categoria do portfólio):
Agrupador de projetos do portfólio, composto só de texto. Aparece no site na ordem definida pelo administrador.
_Avoid_: tag, section, category (sozinho, confunde com a categoria de estoque)

**PortfolioProject** (projeto do portfólio):
Trabalho já realizado exibido na vitrine: imagem de capa obrigatória, fotos de antes e depois opcionais, e tipo de serviço e materiais descritos em texto livre.
_Avoid_: work, job, project (sozinho)

**CompanyEvent** (evento):
Ação ou evento de que a empresa participou, com a data em que aconteceu, descrição e uma imagem. A linha do tempo do site segue a data do evento.
_Avoid_: event (sozinho, colide com os eventos do DOM e do Node)

### Configuração do site

**VisualSettings** (configuração visual):
Tema, logotipo, banners e textos da página inicial. Tem a versão publicada, que o site mostra, e um rascunho que o administrador pré-visualiza antes de publicar; pode ser restaurada para o padrão a qualquer momento.
_Avoid_: theme (sozinho), layout

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
Agrupador de itens de estoque, cadastrado pelo administrador (ex.: tintas, insumos).
_Avoid_: category (sozinho, confunde com a categoria do portfólio)

**StockMovement** (movimentação de estoque):
Entrada (`inbound`) ou saída (`outbound`) de um item de estoque, com quantidade, data, motivo e funcionário. Atualiza o saldo do item e não se liga a nenhuma OS.

**MinimumStock** (estoque mínimo):
Quantidade de referência de um item de estoque. Com o saldo igual ou abaixo dela, o item aparece em alerta até ser reposto.
_Avoid_: transaction

**Supplier** (fornecedor):
Empresa que fornece itens de estoque, cadastrada por qualquer funcionário.
_Avoid_: vendor, provider

**Sale** (venda):
Fechamento de negócio com um cliente, normalmente a partir de um orçamento aprovado. Cada venda gera uma OS e guarda a comissão calculada no lançamento, que não muda se a regra mudar depois.

**Seller** (vendedor):
Funcionário responsável por uma venda e que recebe a comissão dela. É escolhido no lançamento e vem preenchido com quem está lançando.
_Avoid_: salesperson, salesman, vendor
_Avoid_: deal, order

**CommissionRule** (regra de comissão):
Percentual ou valor fixo de comissão, para um funcionário, para uma faixa de valor da venda ou para os dois. Quando várias regras valem para a mesma venda, vence a mais específica: funcionário e faixa, depois só funcionário, depois só faixa, depois a regra geral.
_Avoid_: bonus, fee
