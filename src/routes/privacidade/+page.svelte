<script lang="ts">
    import "$lib/styles/theme.css";

    const atualizadaEm = "03/11/2026";
</script>

<svelte:head>
    <title>Política de privacidade | Átrios</title>
</svelte:head>

<main>
    <a class="voltar" href="/">← Início</a>

    <h1>Política de privacidade</h1>
    <p class="data">Última atualização: {atualizadaEm}</p>

    <h2>Quem somos</h2>
    <p>
        O Átrios é um aplicativo e site de reserva de imóveis por temporada,
        operado por <mark>[PREENCHER: razão social]</mark>, CNPJ
        <mark>[PREENCHER: CNPJ]</mark>. Contato do responsável pelos dados:
        <mark>[PREENCHER: e-mail de contato do responsável]</mark>.
    </p>

    <h2>Quais dados coletamos</h2>
    <ul>
        <li>
            <strong>Cadastro:</strong> nome, e-mail e, se você informar,
            telefone. Sua senha é guardada apenas em forma criptografada (hash)
            e não conseguimos lê-la.
        </li>
        <li>
            <strong>Login com Google ou Apple:</strong> recebemos do provedor
            o identificador da sua conta, seu e-mail e seu nome (na Apple, o nome
            só na primeira autorização). Do Google também recebemos a foto de
            perfil.
        </li>
        <li>
            <strong>Foto de perfil:</strong> a imagem que você escolher, enviada
            por você.
        </li>
        <li>
            <strong>Reservas:</strong> imóvel, datas, número de hóspedes, valor
            e situação da reserva. Quem reserva aparece com o nome para o
            anfitrião e para a equipe do Átrios.
        </li>
        <li>
            <strong>Mensagens:</strong> o texto das conversas entre hóspede e
            anfitrião e das conversas com o suporte do Átrios.
        </li>
        <li>
            <strong>Anúncios (anfitriões):</strong> dados do imóvel, fotos,
            vídeos, guia do hóspede e, se você conectar, os endereços de
            calendário (iCal) do Airbnb e do Booking.
        </li>
        <li>
            <strong>Câmera, galeria e microfone:</strong> só usados quando você
            escolhe tirar ou enviar fotos e vídeos de perfil ou de anúncios.
        </li>
        <li>
            <strong>Formulário de contato do site:</strong> nome, e-mail,
            telefone, assunto e mensagem que você enviar.
        </li>
    </ul>

    <h2>Pagamentos</h2>
    <p>
        O pagamento das reservas é feito na página do Stripe. O Átrios
        <strong>não recebe nem guarda dados do seu cartão</strong>. Guardamos
        apenas o identificador do pagamento e se ele foi confirmado ou
        reembolsado. O Stripe trata seus dados de pagamento conforme a política
        dele.
    </p>

    <h2>Para que usamos os dados</h2>
    <ul>
        <li>Criar sua conta e permitir que você entre nela.</li>
        <li>Fazer, pagar, cancelar e acompanhar reservas.</li>
        <li>Permitir a conversa entre hóspede, anfitrião e suporte.</li>
        <li>
            Enviar por e-mail a confirmação da reserva com o link do check-in.
        </li>
        <li>Operar a limpeza e o atendimento dos imóveis pela equipe.</li>
    </ul>

    <h2>Com quem os dados passam</h2>
    <ul>
        <li><strong>Stripe:</strong> pagamento das reservas.</li>
        <li>
            <strong>Resend:</strong> envio dos e-mails de confirmação da
            reserva (recebe seu e-mail e nome).
        </li>
        <li>
            <strong>Google e Apple:</strong> apenas se você escolher entrar com
            eles.
        </li>
        <li>
            <strong>Vercel e Supabase:</strong> hospedagem do aplicativo, do
            banco de dados e dos arquivos enviados (fotos e vídeos).
        </li>
        <li>
            <strong>Formspree:</strong> recebe as mensagens enviadas pelo
            formulário de contato do site.
        </li>
        <li>
            <strong>Anfitrião da reserva:</strong> vê seu nome e os dados da
            reserva. O link de check-in mostra o nome do hóspede, o período e o
            guia do imóvel a quem tiver o link.
        </li>
    </ul>
    <p>Não vendemos seus dados.</p>

    <h2>Guarda no aparelho</h2>
    <p>
        Para manter você conectado, o app guarda no aparelho um código de
        acesso (token) da sua sessão. Ele é apagado quando você sai da conta.
    </p>

    <h2>Como excluir sua conta</h2>
    <p>
        <strong>Dentro do app ou do site:</strong> abra <em>Perfil</em>, toque em
        <em>Excluir minha conta</em> e confirme com sua senha (ou entrando de
        novo com Apple ou Google). Se você tiver reservas em aberto, como
        hóspede ou como anfitrião, é preciso cancelá-las ou concluí-las antes.
    </p>
    <p>
        <strong>Por contato:</strong> escreva para
        <mark>[PREENCHER: e-mail de contato do responsável]</mark> pedindo a
        exclusão.
    </p>
    <p>Ao excluir a conta:</p>
    <ul>
        <li>
            seu nome, e-mail, telefone, foto de perfil e vínculos com Google e
            Apple são removidos, e a senha deixa de funcionar;
        </li>
        <li>seus anúncios são despublicados;</li>
        <li>
            o registro de reservas e pagamentos já feitos é mantido, sem os
            seus dados pessoais, para que o histórico de anfitriões e de
            pagamentos continue consistente;
        </li>
        <li>
            as mensagens que você enviou permanecem nas conversas dos outros
            participantes, sem seu nome (aparece como "Usuário excluído").
        </li>
    </ul>
    <p>
        Se você entrou com a Apple, também revogamos o acesso do Átrios à sua
        conta Apple.
    </p>

    <h2>Seus direitos</h2>
    <p>
        Conforme a Lei Geral de Proteção de Dados (LGPD), você pode pedir
        acesso, correção ou exclusão dos seus dados pelo contato acima.
    </p>
</main>

<style>
    main {
        max-width: 720px;
        margin: 0 auto;
        padding: 2rem 1.25rem 4rem;
        font-family: var(--fonte-corpo);
        color: var(--cor-texto);
        line-height: 1.6;
        font-size: 0.95rem;
    }

    h1 {
        font-size: 1.6rem;
        margin: 1rem 0 0.2rem;
    }

    h2 {
        font-size: 1.1rem;
        margin: 1.8rem 0 0.4rem;
    }

    .data {
        opacity: 0.6;
        font-size: 0.85rem;
        margin: 0;
    }

    ul {
        padding-left: 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .voltar {
        color: var(--cor-texto);
        opacity: 0.7;
        text-decoration: none;
        font-size: 0.85rem;
    }

    mark {
        background: #fff3a3;
        padding: 0 0.25rem;
        border-radius: 3px;
        font-weight: 600;
    }
</style>
