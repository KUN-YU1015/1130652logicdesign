import React, { useState, useCallback } from 'react'; // 移除了 useEffect 和 useMemo 的導入

// === 核心邏輯轉換自 C++ 部分 (JavaScript/React Adaptation) ===

// 函式：將十進位數字轉換為指定位數的二進位字串
const decToBinary = (dec, numVars) => {
    if (dec === 0) {
        return '0'.repeat(numVars);
    }
    let binaryString = (dec >>> 0).toString(2); // 無符號右移確保正數
    while (binaryString.length < numVars) {
        binaryString = '0' + binaryString;
    }
    return binaryString;
};

// 函式：計算二進位字串中 '1' 的數量
const countSetBits = (binaryString) => {
    let count = 0;
    for (const char of binaryString) {
        if (char === '1') {
            count++;
        }
    }
    return count;
};

// 函式：檢查兩個二進位字串是否僅相差一位
const differByOneBit = (s1, s2) => {
    if (s1.length !== s2.length) {
        return '';
    }
    let diffCount = 0;
    let diffIndex = -1;
    for (let i = 0; i < s1.length; ++i) {
        if (s1[i] !== s2[i]) {
            diffCount++;
            diffIndex = i;
        }
    }
    if (diffCount === 1) {
        const result = s1.split('');
        result[diffIndex] = '-';
        return result.join('');
    }
    return '';
};

// 結構 (模擬)：表示一個術語，用於 Quine-McCluskey 演算法
// 在 JS 中使用物件和 Set 來模擬 C++ 的 struct Term
class Term {
    constructor(binaryString, mintermOrMinterms) {
        this.binaryString = binaryString;
        this.minterms = new Set();
        if (typeof mintermOrMinterms === 'number') {
            this.minterms.add(mintermOrMinterms);
        } else if (mintermOrMinterms instanceof Set) {
            this.minterms = new Set(mintermOrMinterms);
        } else if (Array.isArray(mintermOrMinterms)) {
            this.minterms = new Set(mintermOrMinterms);
        }
        this.used = false;
    }

    // 比較方法，用於在 Set 中儲存唯一的 Term (基於 binaryString)
    equals(other) {
        return this.binaryString === other.binaryString;
    }

    // 將 Term 轉換為可 JSON 序列化的物件，以便於調試或傳輸
    toPlainObject() {
        return {
            binaryString: this.binaryString,
            minterms: Array.from(this.minterms).sort((a, b) => a - b), // 確保順序一致
            used: this.used
        };
    }
}

// 函式：根據最小項集合找出所有主蘊涵項 (Prime Implicants)
const findPrimeImplicants = (mintermsInput, numVars) => {
    if (mintermsInput.length === 0) return new Set();

    // 步驟 1: 初始化組，根據 '1' 的數量分組
    // groups: Map<number, Term[]>
    const groups = new Map();
    for (const m of mintermsInput) {
        const bin = decToBinary(m, numVars);
        const count = countSetBits(bin);
        if (!groups.has(count)) {
            groups.set(count, []);
        }
        groups.get(count).push(new Term(bin, m));
    }

    const primeImplicants = new Set(); // 儲存最終的主蘊涵項 (binary strings)
    let currentGroups = groups;
    let changed = true;

    while (changed) {
        changed = false;
        const nextGroups = new Map();

        // 遍歷所有組進行組合
        // 確保按順序處理組
        const sortedGroupKeys = Array.from(currentGroups.keys()).sort((a, b) => a - b);

        for (let i = 0; i < sortedGroupKeys.length; ++i) {
            const groupKey1 = sortedGroupKeys[i];
            const groupKey2 = sortedGroupKeys[i] + 1; // 總是嘗試與下一個組組合

            if (!currentGroups.has(groupKey1) || !currentGroups.has(groupKey2)) {
                continue; // 如果沒有這兩個組，則跳過
            }

            for (const term1 of currentGroups.get(groupKey1)) {
                for (const term2 of currentGroups.get(groupKey2)) {
                    const combinedBinary = differByOneBit(term1.binaryString, term2.binaryString);
                    if (combinedBinary !== '') {
                        changed = true;
                        term1.used = true;
                        term2.used = true;

                        // 合併最小項集合
                        const combinedMinterms = new Set([...term1.minterms, ...term2.minterms]);

                        const newTerm = new Term(combinedBinary, combinedMinterms);
                        const newTermCount = countSetBits(combinedBinary);

                        // 檢查是否已存在相同的 Term (基於 binaryString)
                        // 在 JS 中 Map 的 value 是陣列，所以要檢查陣列內容
                        let alreadyExists = false;
                        if (nextGroups.has(newTermCount)) {
                            for (const existingTerm of nextGroups.get(newTermCount)) {
                                if (existingTerm.equals(newTerm)) {
                                    alreadyExists = true;
                                    break;
                                }
                            }
                        }

                        if (!alreadyExists) {
                            if (!nextGroups.has(newTermCount)) {
                                nextGroups.set(newTermCount, []);
                            }
                            nextGroups.get(newTermCount).push(newTerm);
                        }
                    }
                }
            }
        }

        // 將本輪中未被使用的術語添加到主蘊涵項集合中
        for (const [key, terms] of currentGroups) {
            for (const term of terms) {
                if (!term.used) {
                    primeImplicants.add(term.binaryString);
                }
            }
        }
        currentGroups = nextGroups; // 更新組，準備下一輪迭代
    }

    // 將最後一輪中未被使用的術語添加到主蘊涵項集合中
    for (const [key, terms] of currentGroups) {
        for (const term of terms) {
            if (!term.used) {
                primeImplicants.add(term.binaryString);
            }
        }
    }
    return primeImplicants;
};

// 函式：將二進位字串的主蘊涵項轉換為文字形式
const piToLiteral = (piBinary, numVars) => {
    let literal = '';
    for (let i = 0; i < numVars; ++i) {
        if (piBinary[i] === '0') {
            literal += String.fromCharCode('A'.charCodeAt(0) + i) + "'";
        } else if (piBinary[i] === '1') {
            literal += String.fromCharCode('A'.charCodeAt(0) + i);
        }
    }
    return literal === '' ? '1' : literal; // 如果是全部 '-' (表示1)，回傳 "1"
};

// 函式：構建 PI Chart 資料 (為了在 React 中渲染，只需要涵蓋關係)
// 回傳: Map<PI_binary_string, Set<minterm_number>>
const buildPIChartData = (primeImplicants, allMinterms, numVars) => {
    const piChartData = new Map(); // Map<string, Set<number>>
    for (const piBinary of primeImplicants) {
        const coveredMinterms = new Set();
        for (const mOriginal of allMinterms) {
            const mintermBinary = decToBinary(mOriginal, numVars);
            let covers = true;
            for (let i = 0; i < piBinary.length; ++i) {
                if (piBinary[i] !== '-' && piBinary[i] !== mintermBinary[i]) {
                    covers = false;
                    break;
                }
            }
            if (covers) {
                coveredMinterms.add(mOriginal);
            }
        }
        piChartData.set(piBinary, coveredMinterms);
    }
    return piChartData;
};

// 函式：精簡產品和形式的項 (Patrick 方法的核心簡化部分)
// 參數 posTerms: string[][] (e.g., [['P1', 'P2'], ['P3', 'P4']])
const simplifyProductOfSums = (posTerms) => {
    if (posTerms.length === 0) return [];

    // 將所有產品和形式的項轉換為 Set<string>
    const setsToMultiply = posTerms.map(arr => new Set(arr));

    // 初始結果為第一個集合
    let resultProducts = [];
    if (!setsToMultiply.empty()) { // ensure setsToMultiply is not empty
        for (const s of setsToMultiply[0]) {
            resultProducts.push([s]);
        }
    } else {
        return []; // No terms to multiply
    }


    // 逐個將其餘集合與當前結果進行乘積
    for (let i = 1; i < setsToMultiply.length; ++i) {
        const newProducts = [];
        for (const currentProduct of resultProducts) {
            for (const sToAdd of setsToMultiply[i]) {
                const tempProduct = [...currentProduct, sToAdd];

                // 對 tempProduct 進行排序和去重，實現吸收律 (A + AB = A)
                const uniqueTerms = Array.from(new Set(tempProduct)).sort();
                newProducts.push(uniqueTerms);
            }
        }
        resultProducts = newProducts;
    }

    // 進一步簡化結果，移除冗餘項 (吸收律)
    // 如果一個產品項是另一個產品項的超集，則移除超集
    const finalUniqueProductsSet = new Set(); // 使用 Set 來儲存唯一的產品項 (序列化後)

    // 將每個產品項 (array) 轉換為排序後的字串，以便在 Set 中比較唯一性
    resultProducts.forEach(product => {
        product.sort(); // 確保內部順序一致
        finalUniqueProductsSet.add(JSON.stringify(product));
    });

    let simplifiedProducts = [];
    const tempProducts = Array.from(finalUniqueProductsSet).map(str => JSON.parse(str));

    for (const p1 of tempProducts) {
        let isRedundant = false;
        for (const p2 of tempProducts) {
            if (p1 === p2) continue;

            // 檢查 p2 是否是 p1 的子集
            // 如果 p2 是 p1 的子集，那麼 p1 是冗餘的 (p1 + p2 = p1)
            const p1Set = new Set(p1);
            const p2Set = new Set(p2);
            let p2IsSubsetOfP1 = true;
            for (const termP2 of p2Set) {
                if (!p1Set.has(termP2)) {
                    p2IsSubsetOfP1 = false;
                    break;
                }
            }
            if (p2IsSubsetOfP1) {
                isRedundant = true;
                break;
            }
        }
        if (!isRedundant) {
            simplifiedProducts.push(p1);
        }
    }

    return simplifiedProducts;
};

// 函式：使用 Patrick 方法解決主蘊涵項表問題，找出最小 SOP
const solvePatrickMethod = (piChartData, allMinterms, numVars) => {
    const essentialPis = new Set(); // 存放必要主蘊涵項 (binary string)
    const coveredByEssential = new Set(); // 存放已被必要主蘊涵項覆蓋的最小項

    // 步驟 1: 找出必要主蘊涵項 (EPIs)
    const mintermCoverCount = new Map(); // Map<minterm, count>
    const mintermCoveringPi = new Map(); // Map<minterm, pi_binary_string> (唯一覆蓋它的 PI)

    for (const m of allMinterms) {
        mintermCoverCount.set(m, 0);
    }

    for (const [piBinary, coveredMinterms] of piChartData) {
        for (const m of coveredMinterms) {
            mintermCoverCount.set(m, (mintermCoverCount.get(m) || 0) + 1);
            mintermCoveringPi.set(m, piBinary); // 暫存
        }
    }

    for (const m of allMinterms) {
        if (mintermCoverCount.get(m) === 1) { // 找到僅被一個 PI 覆蓋的最小項
            essentialPis.add(mintermCoveringPi.get(m));
        }
    }

    // 將 EPI 涵蓋的最小項標記為已覆蓋
    for (const epiBinary of essentialPis) {
        if (piChartData.has(epiBinary)) { // 確保 EPI 在 PI chart data 中
            for (const m of piChartData.get(epiBinary)) {
                coveredByEssential.add(m);
            }
        }
    }

    let remainingMinterms = allMinterms.filter(m => !coveredByEssential.has(m));

    if (remainingMinterms.length === 0) {
        // 所有最小項都被 EPI 覆蓋，SOP 就是 EPI 的和
        if (essentialPis.size === 0) return '0'; // 如果沒有 minterms 且沒有 EPIs，結果是 0
        return Array.from(essentialPis).map(pi => piToLiteral(pi, numVars)).join(' + ');
    }

    const posExpression = []; // 產品和表達式

    for (const mRem of remainingMinterms) {
        const coveringPisForMinterm = [];
        for (const [piBinary, coveredMinterms] of piChartData) {
            // 如果此 PI 不是 EPI 且涵蓋當前剩餘的 minterm
            if (!essentialPis.has(piBinary) && coveredMinterms.has(mRem)) {
                coveringPisForMinterm.push(piBinary);
            }
        }
        if (coveringPisForMinterm.length > 0) {
            posExpression.push(coveringPisForMinterm);
        }
    }

    if (posExpression.length === 0) { // Should not happen if remainingMinterms is not empty unless no PI covers them
        if (essentialPis.size === 0) return '0';
        return Array.from(essentialPis).map(pi => piToLiteral(pi, numVars)).join(' + ');
    }


    // 步驟 3: 展開產品和表達式並簡化
    const productTerms = simplifyProductOfSums(posExpression);

    // 步驟 4: 選擇包含最少 PI 的產品項
    let minSopPisBinary = [];
    let minPisCount = Infinity;

    for (const pTerm of productTerms) {
        const currentPisCount = pTerm.length;
        if (currentPisCount < minPisCount) {
            minPisCount = currentPisCount;
            minSopPisBinary = pTerm;
        }
        // 如果數量相同，可以考慮選擇包含最少文字的 (這裡為了簡潔，只考慮 PI 數量)
    }

    // 構建最終的最小 SOP 字串
    let finalSopLiteralParts = [];

    // 先加上 EPIs
    for (const pi of essentialPis) {
        finalSopLiteralParts.push(piToLiteral(pi, numVars));
    }

    // 再加上從 Patrick 方法選出的 PI
    for (const pi of minSopPisBinary) {
        // 避免重複添加已經是 EPI 的 PI
        if (!essentialPis.has(pi)) {
            finalSopLiteralParts.push(piToLiteral(pi, numVars));
        }
    }

    // 如果沒有任何 PI (例如，輸入的 minterm 集合是空的或者不涵蓋任何東西)
    if (finalSopLiteralParts.length === 0) {
        return '0'; // 邏輯門的恆定 0 輸出
    }

    return finalSopLiteralParts.join(' + ');
};

// === React App 元件 ===

const App = () => {
    const [mode, setMode] = useState('single'); // 'single' 或 'multiple'
    const [singleOutputMintermsInput, setSingleOutputMintermsInput] = useState('');
    const [multipleOutputFunctionsInput, setMultipleOutputFunctionsInput] = useState([{ id: 1, name: 'F1', minterms: '' }]);
    const [results, setResults] = useState(null); // 儲存計算結果
    const [error, setError] = useState(''); // 儲存錯誤訊息

    // 處理最小項輸入的 Helper 函式
    const parseMintermsInput = useCallback((inputString) => {
        const cleanedInput = inputString.replace(/[^0-9\s,]/g, ' '); // 移除除數字、空格、逗號以外的字符
        const mintermStrings = cleanedInput.split(/\s+|,/).filter(s => s.trim() !== '');
        const minterms = mintermStrings.map(Number).filter(n => !isNaN(n));

        let uniqueMinterms = Array.from(new Set(minterms)).sort((a, b) => a - b);

        let numVars = 0;
        if (uniqueMinterms.length > 0) {
            const maxMinterm = Math.max(...uniqueMinterms);
            if (maxMinterm === 0) {
                numVars = 1; // minterm 0 至少需要 1 個變數
            } else {
                numVars = Math.ceil(Math.log2(maxMinterm + 1));
            }
        }
        return { minterms: uniqueMinterms, numVars };
    }, []);

    // 處理單一輸出計算
    const handleSingleOutputCalculate = useCallback(() => {
        setError('');
        setResults(null);
        try {
            let parsedData = parseMintermsInput(singleOutputMintermsInput);
            let minterms = parsedData.minterms;
            let numVars = parsedData.numVars;

            if (minterms.length === 0) {
                setError('請輸入至少一個最小項。');
                return;
            }
            if (numVars === 0) {
                numVars = 1;
            }

            const primeImplicants = findPrimeImplicants(minterms, numVars);
            const piChartData = buildPIChartData(primeImplicants, minterms, numVars);
            const minSOP = solvePatrickMethod(piChartData, minterms, numVars);

            setResults({
                mode: 'single',
                numVars,
                minterms,
                primeImplicants: Array.from(primeImplicants).sort(),
                piChartData: Array.from(piChartData.entries()).map(([pi, coveredM]) => ({
                    pi, coveredM: Array.from(coveredM)
                })),
                minSOP
            });

        } catch (e) {
            console.error(e);
            setError('計算過程中發生錯誤，請檢查輸入。' + e.message);
        }
    }, [singleOutputMintermsInput, parseMintermsInput]);

    // 處理多重輸出計算
    const handleMultipleOutputCalculate = useCallback(() => {
        setError('');
        setResults(null);
        try {
            if (multipleOutputFunctionsInput.length === 0) {
                setError('請至少定義一個輸出函數。');
                return;
            }

            const functionsData = [];
            let overallMaxMinterm = -1;

            // 首先解析所有函數的最小項，並找出總體變數數量
            for (const func of multipleOutputFunctionsInput) {
                if (!func.name.trim()) {
                    setError(`函數名稱不能為空。`);
                    return;
                }
                const { minterms: parsedMinterms, numVars: funcNumVars } = parseMintermsInput(func.minterms);

                if (parsedMinterms.length === 0 && func.minterms.trim() !== '') {
                    setError(`函數 "${func.name}" 的最小項輸入無效。請輸入數字。`);
                    return;
                }

                functionsData.push({
                    name: func.name.trim(),
                    minterms: parsedMinterms,
                    numVars: funcNumVars // 這個函數自己的 numVars
                });
                if (parsedMinterms.length > 0) {
                    overallMaxMinterm = Math.max(overallMaxMinterm, ...parsedMinterms);
                }
            }

            let numVars = 0;
            if (overallMaxMinterm !== -1) {
                if (overallMaxMinterm === 0) {
                    numVars = 1;
                } else {
                    numVars = Math.ceil(Math.log2(overallMaxMinterm + 1));
                }
            } else {
                numVars = 1; // 如果沒有任何最小項，至少設為 1 個變數
            }
            if (numVars === 0) numVars = 1; // 確保 numVars 至少為 1

            const allFunctionResults = [];
            const piOccurrenceCount = new Map(); // Map<PI_binary_string, count>
            const piCoveredByFunctions = new Map(); // Map<PI_binary_string, Set<function_name>>

            for (const func of functionsData) {
                if (func.minterms.length === 0) {
                    allFunctionResults.push({
                        name: func.name,
                        minterms: func.minterms,
                        primeImplicants: [],
                        piChartData: [],
                        minSOP: '0' // 如果沒有最小項，SOP為0
                    });
                    continue;
                }

                // 注意：這裡每個函數的 PI 計算都使用統一的 numVars
                const primeImplicants = findPrimeImplicants(func.minterms, numVars);
                const piChartData = buildPIChartData(primeImplicants, func.minterms, numVars);
                const minSOP = solvePatrickMethod(piChartData, func.minterms, numVars);

                allFunctionResults.push({
                    name: func.name,
                    minterms: func.minterms,
                    primeImplicants: Array.from(primeImplicants).sort(),
                    piChartData: Array.from(piChartData.entries()).map(([pi, coveredM]) => ({
                        pi, coveredM: Array.from(coveredM)
                    })),
                    minSOP
                });

                // 統計 PI 出現次數和被哪些函數包含
                for (const piBinary of primeImplicants) {
                    piOccurrenceCount.set(piBinary, (piOccurrenceCount.get(piBinary) || 0) + 1);
                    if (!piCoveredByFunctions.has(piBinary)) {
                        piCoveredByFunctions.set(piBinary, new Set());
                    }
                    piCoveredByFunctions.get(piBinary).add(func.name);
                }
            }

            const sharedPis = [];
            for (const [piBinary, count] of piOccurrenceCount) {
                if (count > 1) {
                    sharedPis.push({
                        piBinary,
                        literal: piToLiteral(piBinary, numVars),
                        functions: Array.from(piCoveredByFunctions.get(piBinary)).sort()
                    });
                }
            }

            setResults({
                mode: 'multiple',
                numVars,
                allFunctionResults,
                sharedPis: sharedPis.sort((a, b) => a.literal.localeCompare(b.literal))
            });

        } catch (e) {
            console.error(e);
            setError('計算過程中發生錯誤，請檢查輸入。' + e.message);
        }
    }, [multipleOutputFunctionsInput, parseMintermsInput]);

    // 處理新增/移除函數輸入欄
    const addFunctionInput = () => {
        setMultipleOutputFunctionsInput(prev => [
            ...prev,
            { id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1, name: `F${prev.length + 1}`, minterms: '' }
        ]);
    };

    const removeFunctionInput = (id) => {
        setMultipleOutputFunctionsInput(prev => prev.filter(func => func.id !== id));
    };

    const handleFunctionInputChange = (id, field, value) => {
        setMultipleOutputFunctionsInput(prev => prev.map(func =>
            func.id === id ? { ...func, [field]: value } : func
        ));
    };

    // 渲染 PI Chart 的表格
    const renderPIChart = (primeImplicants, minterms, piChartData, numVars) => {
        if (!primeImplicants || primeImplicants.length === 0 || !minterms || minterms.length === 0) {
            return <p>無主蘊涵項圖表可顯示。</p>;
        }

        // 確保 piChartData 是一個 Map
        const piChartMap = new Map(piChartData.map(item => [item.pi, new Set(item.coveredM)]));

        return (
            <div className="overflow-x-auto my-4 p-4 bg-gray-100 rounded-lg shadow-inner">
                <h4 className="text-lg font-semibold mb-2">主蘊涵項表 (PI Chart)</h4>
                <table className="min-w-full bg-white border border-gray-300 rounded-lg text-sm">
                    <thead>
                        <tr className="bg-gray-200">
                            {/* ESLint 警告抑制：此處的 key 是 React prop，不應被誤認為未使用的變數 */}
                            {minterms.map((m) => ( // 移除了 index 參數，因為它未使用
                                <th key={m} className="py-2 px-2 border-b border-gray-300 text-center w-auto">
                                    {m}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {primeImplicants.map(piBinary => (
                            <tr key={piBinary} className="hover:bg-gray-50">
                                <td className="py-2 px-4 border-b border-gray-300 text-left">
                                    {piBinary} ({piToLiteral(piBinary, numVars)})
                                </td>
                                {/* ESLint 警告抑制：此處的 key 是 React prop，不應被誤認為未使用的變數 */}
                                {minterms.map((m) => ( // 移除了 index 參數，因為它未使用
                                    <td key={`${piBinary}-${m}`} className="py-2 px-2 border-b border-gray-300 text-center">
                                        {piChartMap.has(piBinary) && piChartMap.get(piBinary).has(m) ? 'X' : ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 flex flex-col items-center p-6 font-inter">
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                .font-inter {
                    font-family: 'Inter', sans-serif;
                }
                /* Custom scrollbar for aesthetic */
                ::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 10px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                `}
            </style>
            <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl p-8 transform transition-all duration-300 hover:scale-[1.005]">
                <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">Patrick 方法 SOP 計算器</h1>

                {/* 模式選擇 */}
                <div className="mb-6 flex justify-center space-x-4">
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio h-5 w-5 text-blue-600 rounded-full"
                            name="mode"
                            value="single"
                            checked={mode === 'single'}
                            onChange={() => { setMode('single'); setResults(null); setError(''); }}
                        />
                        <span className="ml-2 text-gray-700 text-lg">單一輸出 (Single Output)</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="radio"
                            className="form-radio h-5 w-5 text-blue-600 rounded-full"
                            name="mode"
                            value="multiple"
                            checked={mode === 'multiple'}
                            onChange={() => { setMode('multiple'); setResults(null); setError(''); }}
                        />
                        <span className="ml-2 text-gray-700 text-lg">多重輸出 (Multiple Output)</span>
                    </label>
                </div>

                {/* 錯誤訊息顯示 */}
                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
                        <strong className="font-bold">錯誤! </strong>
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}

                {/* 輸入區塊 - 單一輸出 */}
                {mode === 'single' && (
                    <div className="mb-8 p-6 bg-blue-50 rounded-lg shadow-md border border-blue-200">
                        <h2 className="text-2xl font-semibold text-blue-800 mb-4">單一輸出計算</h2>
                        <label htmlFor="singleMinterms" className="block text-gray-700 text-lg font-medium mb-2">
                            請輸入最小項 (minterms)，以空格或逗號分隔，例如: 0 1 2 5 6 或 0,1,2,5,6
                        </label>
                        <textarea
                            id="singleMinterms"
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                            rows="3"
                            placeholder="例如: 0 1 2 5 6 7 8 9 10 11 12 13 14 15"
                            value={singleOutputMintermsInput}
                            onChange={(e) => setSingleOutputMintermsInput(e.target.value)}
                        ></textarea>
                        <button
                            onClick={handleSingleOutputCalculate}
                            className="mt-4 w-full bg-blue-600 text-white py-3 px-6 rounded-lg shadow-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 font-semibold text-lg"
                        >
                            計算最小 SOP
                        </button>
                    </div>
                )}

                {/* 輸入區塊 - 多重輸出 */}
                {mode === 'multiple' && (
                    <div className="mb-8 p-6 bg-green-50 rounded-lg shadow-md border border-green-200">
                        <h2 className="text-2xl font-semibold text-green-800 mb-4">多重輸出計算</h2>
                        <p className="text-gray-700 mb-4">
                            請為每個輸出函數輸入最小項。
                        </p>
                        {multipleOutputFunctionsInput.map((func, index) => (
                            <div key={func.id} className="flex items-center mb-4 space-x-2">
                                <input
                                    type="text"
                                    className="w-20 p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                                    placeholder={`F${index + 1}`}
                                    value={func.name}
                                    onChange={(e) => handleFunctionInputChange(func.id, 'name', e.target.value)}
                                />
                                <span className="text-gray-700 font-bold">:</span>
                                <input
                                    type="text"
                                    className="flex-grow p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                                    placeholder="最小項 (例如: 0 1 2 5 6)"
                                    value={func.minterms}
                                    onChange={(e) => handleFunctionInputChange(func.id, 'minterms', e.target.value)}
                                />
                                {multipleOutputFunctionsInput.length > 1 && (
                                    <button
                                        onClick={() => removeFunctionInput(func.id)}
                                        className="bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition duration-200 ease-in-out transform hover:scale-110"
                                        title="移除此函數"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm1 5a1 1 0 001 1h2a1 1 0 100-2H9a1 1 0 00-1 1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={addFunctionInput}
                            className="mt-2 mr-2 bg-green-500 text-white py-2 px-4 rounded-lg shadow-md hover:bg-green-600 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 font-semibold"
                        >
                            新增函數
                        </button>
                        <button
                            onClick={handleMultipleOutputCalculate}
                            className="mt-2 bg-green-600 text-white py-2 px-4 rounded-lg shadow-lg hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 font-semibold"
                        >
                            計算所有函數的 PI
                        </button>
                    </div>
                )}

                {/* 結果顯示區塊 */}
                {results && (
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-300 mt-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">計算結果</h2>
                        <p className="text-gray-600 mb-4 text-center">
                            推斷的變數數量: <span className="font-bold text-blue-700">{results.numVars}</span>
                        </p>

                        {results.mode === 'single' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-3">輸入的最小項:</h3>
                                <p className="text-gray-800 bg-gray-50 p-3 rounded-md border border-gray-200">
                                    {results.minterms.join(', ')}
                                </p>

                                <h3 className="text-xl font-semibold text-gray-700 my-3">所有主蘊涵項 (PIs):</h3>
                                <ul className="list-disc list-inside bg-gray-50 p-3 rounded-md border border-gray-200">
                                    {results.primeImplicants.map(pi => (
                                        <li key={pi} className="text-gray-800">
                                            {pi} ({piToLiteral(pi, results.numVars)})
                                        </li>
                                    ))}
                                </ul>

                                {renderPIChart(results.primeImplicants, results.minterms, results.piChartData, results.numVars)}

                                <h3 className="text-xl font-semibold text-gray-700 my-3">最終最小 SOP:</h3>
                                <p className="text-2xl font-bold text-indigo-700 bg-indigo-50 p-4 rounded-md border border-indigo-200 break-words">
                                    {results.minSOP}
                                </p>
                            </div>
                        )}

                        {results.mode === 'multiple' && (
                            <div>
                                <h3 className="text-xl font-semibold text-gray-700 mb-3">各函數獨立計算結果:</h3>
                                {results.allFunctionResults.map((funcResult, index) => (
                                    <div key={index} className="mb-6 p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-2">函數 {funcResult.name}:</h4>
                                        <p className="text-gray-700 mb-2">最小項: {funcResult.minterms.join(', ')}</p>
                                        <h5 className="text-md font-semibold text-gray-700 mb-1">主蘊涵項 (PIs):</h5>
                                        <ul className="list-disc list-inside text-gray-800">
                                            {funcResult.primeImplicants.length > 0 ?
                                                funcResult.primeImplicants.map(pi => (
                                                    <li key={pi}>{pi} ({piToLiteral(pi, results.numVars)})</li>
                                                )) : <li>無 PI</li>
                                            }
                                        </ul>
                                        <h5 className="text-md font-semibold text-gray-700 my-1">獨立最小 SOP:</h5>
                                        <p className="text-xl font-bold text-blue-700 break-words">{funcResult.minSOP}</p>
                                    </div>
                                ))}

                                <h3 className="text-xl font-semibold text-gray-700 my-3">潛在共享主蘊涵項 (Potential Shared PIs):</h3>
                                {results.sharedPis.length > 0 ? (
                                    <ul className="list-disc list-inside bg-blue-50 p-3 rounded-md border border-blue-200">
                                        {results.sharedPis.map(pi => (
                                            <li key={pi.piBinary} className="text-gray-800">
                                                {pi.literal} ({pi.piBinary}) 被函數 {pi.functions.join(', ')} 共享。
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-gray-700 bg-blue-50 p-3 rounded-md border border-blue-200">未發現明顯的共享主蘊涵項。</p>
                                )}
                                <p className="text-sm text-gray-500 mt-4 italic">
                                    注意：此應用程式僅獨立計算各函數的 PIs 並識別共享 PI。真正的多重輸出最小化需要更複雜的演算法，例如擴展的 Quine-McCluskey 或 Espresso，以整體優化所有輸出的總成本（例如門數量、文字數量），即使這可能導致個別輸出函數的 SOP 並非絕對最小。
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <footer className="mt-8 text-gray-600 text-sm text-center">
                <p>&copy; 2024 Patrick Method SOP Calculator</p>
                <p>Designed for Digital Logic Design projects.</p>
            </footer>
        </div>
    );
};

export default App;
