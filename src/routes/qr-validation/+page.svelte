<script>
    /** @type {import('./$types').PageData} */
    export let data;
</script>

<div class="purchase-info-container">
    <h1>Datos de la compra:</h1>
    <div class="table-container">
        <table>
            <tr>
                <th>Transacción #</th>
                <td>{data.purchaseId}</td>
            </tr>
            <tr>
                <th>Evento</th>
                <td>{data.eventName}</td>
            </tr>
            <tr>
                <th>Estado de la compra</th>
                {#if data.purchaseStatus == 'APPROVED'}
                    <td>APROBADA (No se envió correo)</td>
                {:else if data.purchaseStatus == 'EMAIL_SENT'}
                    <td>APROBADA Y CORREO ENVIADO</td>
                {:else if data.purchaseStatus == 'PENDING'}
                    <td>PENDIENTE</td>
                {:else if data.purchaseStatus == 'DECLINED'}
                    <td>DECLINADA</td>
                {:else}
                    <td />
                {/if}
            </tr>
            <tr>
                <th>Nombre del comprador</th>
                <td>{data.customerName}</td>
            </tr>
            <tr>
                <th>Correo del comprador</th>
                <td>{data.customerEmail}</td>
            </tr>
        </table>
    </div>
</div>

<style>
    .purchase-info-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    h1 {
        background-color: var(--color-primary);
        color: white;
        text-align: center;
        margin: 20px 5%;
    }

    table {
        table-layout: fixed;
        width: 90%;
        border: 3px solid black;
        margin-left: auto;
        margin-right: auto;
    }

    tr:nth-child(even){
        background-color: #f2f2f2;
    }

    td, th {
        border: 1px solid #ddd;
        padding: 8px;
        word-wrap: break-word;
    }

    th {
        font-family: 'Myriad Pro', sans-serif;
        text-align: end;
        color: var(--color-primary);
        padding: 0px 10px;
    }
</style>
