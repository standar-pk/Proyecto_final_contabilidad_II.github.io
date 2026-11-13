
function openTab(evt, tabId) {
    const contents = document.querySelectorAll('.tab-content');
    contents.forEach(c => c.classList.remove('active'));

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

function calcularFM() {
    const ac = parseFloat(document.getElementById('ac').value) || 0;
    const pc = parseFloat(document.getElementById('pc').value) || 0;
    const fm = ac - pc;
    const ratio = pc > 0 ? (ac / pc).toFixed(2) : "N/A";

    let estado = "";
    if (fm > 0 && ratio >= 1.5) {
        estado = "Equilibrio Saludable";
    } else if (fm > 0) {
        estado = "Liquidez Ajustada";
    } else {
        estado = "Riesgo de Suspensión de Pagos";
    }

    document.getElementById('res-fm').innerHTML =
        `Fondo de Maniobra: Q ${fm.toLocaleString('es-GT', {minimumFractionDigits: 2})} | Ratio Liquidez: ${ratio} (${estado})`;
}

function calcularVAN() {
    const inv = parseFloat(document.getElementById('inv').value) || 0;
    const tasa = (parseFloat(document.getElementById('tasa').value) || 0) / 100;
    const flujo = parseFloat(document.getElementById('flujo').value) || 0;

    let vpFlujos = 0;
    for (let t = 1; t <= 3; t++) {
        vpFlujos += flujo / Math.pow(1 + tasa, t);
    }

    const van = vpFlujos - inv;
    const decision = van > 0 ? "Proyecto Viable (Genera Valor)" : (van === 0 ? "Indiferente" : "Proyecto No Viable");

    document.getElementById('res-van').innerHTML =
        `VAN: Q ${van.toLocaleString('es-GT', {minimumFractionDigits: 2, maximumFractionDigits: 2})} | Decisión: ${decision}`;
}


// FUNCIONES AÑADIDAS: seis calculadoras nuevas; no alteran las originales.
(() => {
    const money = (value) => new Intl.NumberFormat("es-GT", {
        style: "currency",
        currency: "GTQ",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);

    function numberFrom(id) {
        return Number(document.getElementById(id).value);
    }

    function showResult(id, message, isNegative = false) {
        const result = document.getElementById(id);
        result.textContent = message;
        result.classList.toggle("negative", isNegative);
    }

    document.getElementById("profitForm").addEventListener("submit", event => {
        event.preventDefault();
        const sales = numberFrom("sales");
        const profit = numberFrom("profit");

        if (sales <= 0) {
            showResult("profitResult", "Las ventas deben ser mayores que cero.", true);
            return;
        }

        const margin = (profit / sales) * 100;
        showResult("profitResult", `Margen de utilidad: ${margin.toFixed(2)}%`, margin < 0);
    });

    document.getElementById("cashForm").addEventListener("submit", event => {
        event.preventDefault();
        const net = numberFrom("inflows") - numberFrom("outflows");
        showResult("cashResult", `Flujo neto: ${money(net)}`, net < 0);
    });

    document.getElementById("makeBuyForm").addEventListener("submit", event => {
        event.preventDefault();
        const quantity = numberFrom("quantity");
        const makeCost = numberFrom("makeCost");
        const buyCost = numberFrom("buyCost");

        if (quantity <= 0 || makeCost < 0 || buyCost < 0) {
            showResult("makeBuyResult", "Ingresa una cantidad válida y costos no negativos.", true);
            return;
        }

        const makeTotal = quantity * makeCost;
        const buyTotal = quantity * buyCost;
        const difference = Math.abs(makeTotal - buyTotal);

        if (Math.abs(makeTotal - buyTotal) < 0.005) {
            showResult("makeBuyResult", `Ambas alternativas tienen el mismo costo: ${money(makeTotal)}.`);
        } else if (makeTotal < buyTotal) {
            showResult("makeBuyResult", `Producir costaría ${money(difference)} menos (${money(makeTotal)} frente a ${money(buyTotal)}).`);
        } else {
            showResult("makeBuyResult", `Comprar costaría ${money(difference)} menos (${money(buyTotal)} frente a ${money(makeTotal)}).`);
        }
    });

    document.getElementById("equityForm").addEventListener("submit", event => {
        event.preventDefault();
        const assets = numberFrom("assets");
        const liabilities = numberFrom("liabilities");

        if (assets < 0 || liabilities < 0) {
            showResult("equityResult", "Los valores no pueden ser negativos.", true);
            return;
        }

        const equity = assets - liabilities;
        showResult("equityResult", `Patrimonio: ${money(equity)}${equity < 0 ? " · Los pasivos superan los activos." : ""}`, equity < 0);
    });

    function getCashflows(prefix) {
        return [1, 2, 3, 4, 5].map(year => numberFrom(`${prefix}${year}`));
    }

    function calculateNpv(initial, rate, flows) {
        return flows.reduce((sum, flow, index) => sum + flow / Math.pow(1 + rate, index + 1), -initial);
    }

    document.getElementById("vanForm").addEventListener("submit", event => {
        event.preventDefault();
        const initial = numberFrom("initialInvestment");
        const ratePercent = numberFrom("discountRate");
        const flows = getCashflows("cf");

        if (initial < 0 || ratePercent < 0 || ratePercent > 1000) {
            showResult("vanResult", "Revisa la inversión y la tasa ingresadas.", true);
            return;
        }

        const van = calculateNpv(initial, ratePercent / 100, flows);
        const interpretation = van > 0 ? "VAN positivo" : van < 0 ? "VAN negativo" : "VAN igual a cero";
        showResult("vanResult", `VAN: ${money(van)} · ${interpretation}`, van < 0);
    });

    function npvForRate(rate, initial, flows) {
        return calculateNpv(initial, rate, flows);
    }

    function calculateIrr(initial, flows) {
        const allFlows = [-initial, ...flows];
        const hasPositive = allFlows.some(value => value > 0);
        const hasNegative = allFlows.some(value => value < 0);

        if (!hasPositive || !hasNegative) return null;

        let low = -0.9999;
        let high = 1;
        let lowValue = npvForRate(low, initial, flows);
        let highValue = npvForRate(high, initial, flows);

        while (lowValue * highValue > 0 && high < 100000) {
            high *= 2;
            highValue = npvForRate(high, initial, flows);
        }

        if (lowValue * highValue > 0) return null;

        for (let i = 0; i < 250; i++) {
            const mid = (low + high) / 2;
            const midValue = npvForRate(mid, initial, flows);

            if (Math.abs(midValue) < 1e-8) return mid;

            if (lowValue * midValue <= 0) {
                high = mid;
                highValue = midValue;
            } else {
                low = mid;
                lowValue = midValue;
            }
        }

        return (low + high) / 2;
    }

    document.getElementById("tirForm").addEventListener("submit", event => {
        event.preventDefault();
        const initial = numberFrom("tirInvestment");
        const flows = getCashflows("tirCf");

        if (initial <= 0) {
            showResult("tirResult", "La inversión inicial debe ser mayor que cero.", true);
            return;
        }

        const irr = calculateIrr(initial, flows);

        if (irr === null || !Number.isFinite(irr)) {
            showResult("tirResult", "No se encontró una TIR única con estos flujos. Revisa los valores.", true);
            return;
        }

        showResult("tirResult", `TIR aproximada: ${(irr * 100).toFixed(2)}%`);
    });

    // Calcula los valores de ejemplo al cargar la página.
    document.getElementById("profitForm").requestSubmit();
    document.getElementById("cashForm").requestSubmit();
    document.getElementById("makeBuyForm").requestSubmit();
    document.getElementById("equityForm").requestSubmit();
    document.getElementById("vanForm").requestSubmit();
    document.getElementById("tirForm").requestSubmit();
})();
