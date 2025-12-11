/**
 * Child Site JavaScript
 * 
 * このスクリプトは、子サイトのコンテンツの高さを監視し、
 * 高さが変化した際に親サイト（iframeを埋め込んでいるサイト）に通知します。
 * 
 * 主な機能:
 * 1. ボタンクリックでコンテンツの展開/折りたたみ
 * 2. 高さの変化を検出して親サイトにpostMessageで通知
 * 3. 複数の方法で高さの変化を監視（MutationObserver、resize、定期チェック）
 */

console.log('[CHILD] Script loading...');
const childStartTime = performance.now();

/**
 * DOMContentLoadedイベント: DOMの構築が完了した時点で実行
 * 注意: この時点では画像やスタイルシートの読み込みは完了していない可能性がある
 */
document.addEventListener('DOMContentLoaded', function () {
    console.log('[CHILD] DOMContentLoaded event fired');
    const loadTime = performance.now() - childStartTime;
    console.log(`[CHILD] DOM ready in ${loadTime.toFixed(2)}ms`);

    const toggleButton = document.getElementById('toggle-button');
    const expandableContent = document.getElementById('expandable-content');
    const stateInfo = document.getElementById('state-info');
    const currentHeightDisplay = document.getElementById('current-height');
    let isExpanded = false;

    console.log('[CHILD] Elements found:', {
        toggleButton: !!toggleButton,
        expandableContent: !!expandableContent,
        stateInfo: !!stateInfo,
        currentHeightDisplay: !!currentHeightDisplay
    });

    // Check if all required elements exist
    if (!toggleButton || !expandableContent || !stateInfo || !currentHeightDisplay) {
        console.error('[CHILD] Required elements not found');
        return;
    }

    /**
     * updateHeightDisplay()
     * 
     * 現在のページの高さを取得し、表示を更新して親サイトに通知します。
     * 
     * 処理内容:
     * 1. document.body.scrollHeight と document.documentElement.scrollHeight の両方を取得
     *    - body.scrollHeight: body要素のスクロール可能な高さ
     *    - documentElement.scrollHeight: html要素のスクロール可能な高さ
     *    - より大きい方（または利用可能な方）を使用
     * 2. 画面に現在の高さを表示
     * 3. 親サイトにpostMessageで高さを通知
     * 
     * 最適化:
     * - 前回の高さと同じ場合は更新をスキップ（不要な処理を避ける）
     * - silentパラメータでログの出力を制御（定期チェック時はサイレントモード）
     */
    let updateCount = 0;
    let lastHeight = 0; // 前回の高さを記録（不要な更新を防ぐ）
    function updateHeightDisplay(silent = false) {
        updateCount++;
        const updateStartTime = performance.now();
        try {
            // 両方の高さを取得して、より正確な値を取得
            const bodyHeight = document.body.scrollHeight;
            const docHeight = document.documentElement.scrollHeight;
            const height = bodyHeight || docHeight;

            // 高さが変わっていない場合はスキップ（不要な処理を避ける）
            if (height === lastHeight) {
                if (!silent) {
                    console.log(`[CHILD] Height unchanged (${height}px), skipping update`);
                }
                return;
            }

            // 高さが変化した場合のみログを出力
            if (!silent) {
                console.log(`[CHILD] updateHeightDisplay #${updateCount}:`, {
                    bodyScrollHeight: bodyHeight,
                    docScrollHeight: docHeight,
                    finalHeight: height,
                    previousHeight: lastHeight,
                    heightChanged: true
                });
            }

            // 前回の高さを更新
            lastHeight = height;

            // 画面表示を更新
            if (currentHeightDisplay) {
                currentHeightDisplay.textContent = height;
            }

            // 親サイトに高さの変化を通知
            notifyParentHeightChange(height);

            const updateTime = performance.now() - updateStartTime;
            if (!silent) {
                console.log(`[CHILD] Height update completed in ${updateTime.toFixed(2)}ms`);
            }
        } catch (e) {
            console.error('[CHILD] Error updating height display:', e);
        }
    }

    /**
     * notifyParentHeightChange(height)
     * 
     * 親サイト（iframeを埋め込んでいるサイト）に、高さの変化を通知します。
     * 
     * 使用技術: postMessage API
     * - クロスオリジン通信を安全に行うための標準API
     * - window.parent.postMessage() で親ウィンドウにメッセージを送信
     * 
     * メッセージ形式:
     * {
     *   type: 'height-change',
     *   height: <数値>  // ピクセル単位の高さ
     * }
     * 
     * 注意: 現在は '*' をターゲットオリジンとして使用しているが、
     * 本番環境では親サイトの正確なオリジンを指定すべき（セキュリティのため）
     * 
     * @param {number} height - 新しい高さ（ピクセル単位）
     */
    let messageCount = 0;
    function notifyParentHeightChange(height) {
        messageCount++;
        try {
            // 親ウィンドウが存在し、かつ現在のウィンドウと異なる場合のみ送信
            // （iframe内で実行されている場合のみ有効）
            if (window.parent && window.parent !== window) {
                const message = {
                    type: 'height-change',
                    height: height
                };
                console.log(`[CHILD] Sending postMessage #${messageCount} to parent:`, message);
                // 親サイトにメッセージを送信
                // 第2引数 '*' は任意のオリジンからのメッセージを受け取ることを意味する
                // 本番環境では 'https://kzk4043.github.io' のように具体的なオリジンを指定すべき
                window.parent.postMessage(message, '*');
                console.log(`[CHILD] postMessage sent successfully`);
            } else {
                // 親ウィンドウがない、または同じウィンドウの場合（iframe外で直接開いている場合）
                console.log('[CHILD] No parent window or same window, skipping postMessage');
            }
        } catch (e) {
            console.error('[CHILD] Could not send message to parent:', e);
        }
    }

    /**
     * トグルボタンのクリックイベント
     * 
     * ユーザーがボタンをクリックすると、コンテンツの展開/折りたたみを切り替えます。
     * 
     * 処理フロー:
     * 1. クリックイベントを受け取る
     * 2. isExpandedフラグを反転
     * 3. CSSクラスを追加/削除してコンテンツの表示/非表示を切り替え
     * 4. ボタンのテキストとスタイルを更新
     * 5. setTimeoutで100ms後に高さを更新
     *    → なぜsetTimeoutが必要か:
     *       - CSS transition（0.5秒）が完了する前に高さを測定すると、
     *         まだ展開中の途中の高さを取得してしまう可能性がある
     *       - 100ms待つことで、CSS transitionが進行した後の
     *         より正確な高さを取得できる
     *       - ただし、完全にtransitionが終わるまで待つ必要はない
     *         （親サイトが高さを調整するのに十分な時間を確保）
     */
    console.log('[CHILD] Adding click event listener to toggle button');
    toggleButton.addEventListener('click', function () {
        const clickTime = performance.now();
        console.log('[CHILD] Toggle button clicked');
        isExpanded = !isExpanded;

        if (isExpanded) {
            console.log('[CHILD] Expanding content');
            // 'expanded'クラスを追加することで、CSSで定義された
            // max-height: 2000px が適用され、コンテンツが表示される
            expandableContent.classList.add('expanded');
            toggleButton.textContent = 'Click to Collapse Content';
            toggleButton.classList.add('expanded');
            stateInfo.textContent = 'Content is expanded';
        } else {
            console.log('[CHILD] Collapsing content');
            // 'expanded'クラスを削除することで、max-height: 0 に戻り、
            // コンテンツが非表示になる
            expandableContent.classList.remove('expanded');
            toggleButton.textContent = 'Click to Expand Content';
            toggleButton.classList.remove('expanded');
            stateInfo.textContent = 'Content is collapsed';
        }

        /**
         * 高さ更新のタイミング制御
         * 
         * CSS transitionは0.5秒（500ms）かけて実行されるため、クラスの追加/削除直後に
         * scrollHeightを取得すると、まだ途中の高さを取得してしまう可能性がある。
         * 
         * 展開時: 100ms待つ
         * - 展開は視覚的にわかりやすく、途中の高さでも問題ない
         * - より早く親サイトに通知できる
         * 
         * 折りたたみ時: transitionendイベントを待つ（より正確）
         * - 折りたたみ時は正確な最終高さを取得する必要がある
         * - transitionendイベントでtransition完了を確実に検知
         * - フォールバックとして600msのタイムアウトも設定
         */
        if (isExpanded) {
            // 展開時: 100ms待つ（視覚的な反応を早くするため）
            console.log('[CHILD] Scheduling height update in 100ms (expanding)');
            setTimeout(function () {
                updateHeightDisplay();
                const totalTime = performance.now() - clickTime;
                console.log(`[CHILD] Toggle action completed in ${totalTime.toFixed(2)}ms`);
            }, 100);
        } else {
            // 折りたたみ時: transitionendイベントを待つ（より正確）
            console.log('[CHILD] Waiting for transitionend event (collapsing)');

            let transitionEndFired = false;
            let transitionTimeout = null;

            // transitionendイベントリスナー（一度だけ実行）
            const handleTransitionEnd = function (event) {
                // 対象要素のtransitionのみ処理
                if (event.target === expandableContent && !transitionEndFired) {
                    transitionEndFired = true;
                    console.log('[CHILD] transitionend event fired');

                    if (transitionTimeout) {
                        clearTimeout(transitionTimeout);
                    }

                    // イベントリスナーを削除
                    expandableContent.removeEventListener('transitionend', handleTransitionEnd);

                    // 高さを更新
                    updateHeightDisplay();
                    const totalTime = performance.now() - clickTime;
                    console.log(`[CHILD] Toggle action completed in ${totalTime.toFixed(2)}ms`);
                }
            };

            // transitionendイベントリスナーを追加
            expandableContent.addEventListener('transitionend', handleTransitionEnd);

            // フォールバック: 600ms後にタイムアウト（transitionが完了しない場合の保険）
            transitionTimeout = setTimeout(function () {
                if (!transitionEndFired) {
                    console.log('[CHILD] Transition timeout, updating height anyway');
                    transitionEndFired = true;
                    expandableContent.removeEventListener('transitionend', handleTransitionEnd);
                    updateHeightDisplay();
                    const totalTime = performance.now() - clickTime;
                    console.log(`[CHILD] Toggle action completed (timeout) in ${totalTime.toFixed(2)}ms`);
                }
            }, 600); // CSS transition (500ms) + 余裕を持たせて600ms
        }
    });

    /**
     * 初期高さの更新
     * 
     * ページ読み込み時に、初期状態の高さを親サイトに通知します。
     * 
     * setTimeout の理由:
     * - DOMContentLoadedはDOMの構築が完了した時点で発火するが、
     *   スタイルシートの読み込みやレンダリングはまだ完了していない可能性がある
     * - 画像の読み込みが完了していない場合もある
     * - 100ms待つことで、ブラウザがレンダリングを完了し、
     *   正確な高さを取得できる可能性が高まる
     * 
     * 注意: 完全にすべてのリソースが読み込まれるまで待つわけではない
     * （window.onloadを待つと遅すぎる可能性がある）
     */
    console.log('[CHILD] Scheduling initial height update in 100ms');
    setTimeout(function () {
        console.log('[CHILD] Performing initial height update');
        updateHeightDisplay();
    }, 100);

    /**
     * ウィンドウリサイズイベント
     * 
     * ブラウザウィンドウのサイズが変更された際に、高さを再計算して親サイトに通知します。
     * 
     * 注意: リサイズイベントは頻繁に発火する可能性があるため、
     * デバウンス処理を追加することも検討できるが、
     * 今回は即座に更新することで、レスポンシブな動作を確保
     */
    console.log('[CHILD] Adding window resize event listener');
    window.addEventListener('resize', function () {
        console.log('[CHILD] Window resized');
        updateHeightDisplay();
    });

    /**
     * MutationObserver: DOMの変更を監視
     * 
     * DOM要素の追加・削除・属性変更を監視し、高さに影響する可能性のある
     * 変更を検出した際に高さを更新します。
     * 
     * 監視対象:
     * - childList: true → 子要素の追加・削除を監視
     * - subtree: true → 子孫要素も含めて監視
     * - attributes: true → 属性の変更を監視
     * - attributeFilter: ['class', 'style'] → classとstyle属性のみ監視
     *   （他の属性変更は高さに影響しないため）
     * 
     * 最適化:
     * - デバウンス処理を追加: 短時間に複数回発火した場合、最後の1回だけ実行
     * - ログの出力を最小限に: 実際に高さが変化した場合のみ詳細ログ
     */
    let observer;
    let mutationCount = 0;
    let mutationDebounceTimer = null;

    if (typeof MutationObserver !== 'undefined') {
        try {
            console.log('[CHILD] Creating MutationObserver with debouncing');
            observer = new MutationObserver(function (mutations) {
                mutationCount++;

                // デバウンス処理: 300ms以内に複数回発火した場合、最後の1回だけ実行
                if (mutationDebounceTimer) {
                    clearTimeout(mutationDebounceTimer);
                }

                mutationDebounceTimer = setTimeout(function () {
                    // 実際に高さに影響する可能性のある変更のみログ出力
                    const hasRelevantChanges = mutations.some(function (mutation) {
                        return mutation.type === 'attributes' &&
                            (mutation.attributeName === 'class' || mutation.attributeName === 'style');
                    });

                    if (hasRelevantChanges) {
                        console.log(`[CHILD] MutationObserver: relevant change detected (#${mutationCount})`);
                    }

                    // DOMの変更が検出されたら、高さを再計算（サイレントモード）
                    // updateHeightDisplay内で高さが変わっていない場合はスキップされる
                    updateHeightDisplay(true); // silent = true
                }, 300); // 300msのデバウンス
            });

            // document.body全体を監視対象に設定
            observer.observe(document.body, {
                childList: true,      // 子要素の追加・削除を監視
                subtree: true,        // 子孫要素も含めて監視
                attributes: true,     // 属性の変更を監視
                attributeFilter: ['class', 'style']  // classとstyle属性のみ
            });
            console.log('[CHILD] MutationObserver attached to document.body');
        } catch (e) {
            console.warn('[CHILD] MutationObserver not supported:', e);
        }
    } else {
        console.warn('[CHILD] MutationObserver not available in this browser');
    }

    /**
     * 定期的高さチェック（フォールバック）
     * 
     * 他の監視方法（MutationObserver、resizeイベント）で検出できなかった
     * 高さの変化を検出するためのフォールバック機能。
     * 
     * 実行頻度: 3秒ごと（パフォーマンス向上のため1秒から3秒に変更）
     * 
     * なぜ必要か:
     * - MutationObserverが検出できない変更（例: 外部スクリプトによる変更）
     * - アニメーションやトランジションによる段階的な高さの変化
     * - 他の監視方法が失敗した場合の保険
     * 
     * 最適化:
     * - 間隔を3秒に延長してパフォーマンスへの影響を軽減
     * - サイレントモードで実行（高さが変わっていない場合はログを出力しない）
     * - updateHeightDisplay内で高さが変わっていない場合は自動的にスキップされる
     * 
     * 注意: このsetIntervalは、ページが閉じられるまで実行され続ける。
     * 必要に応じて、ページアンロード時にclearInterval()でクリーンアップすることも検討できる。
     */
    console.log('[CHILD] Starting periodic height check (every 3s, silent mode)');
    let heightCheckInterval = setInterval(function () {
        // サイレントモードで実行（高さが変わっていない場合はログを出力しない）
        updateHeightDisplay(true); // silent = true
    }, 3000); // 3秒間隔に変更（パフォーマンス向上）

    const initTime = performance.now() - childStartTime;
    console.log(`[CHILD] Initialization complete in ${initTime.toFixed(2)}ms`);
});

