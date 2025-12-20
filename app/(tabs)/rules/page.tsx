'use client';

export default function RulesPage() {
  return (
    <div className="rules-page">
      <header>
        <h1>Big Two Rules</h1>
        <p>Quick refresher on rank order for five-card hands.</p>
      </header>

      <section className="card">
        <h2>Highest 5-card hands</h2>
        <ol className="rules-list">
          <li>
            <strong>Straight flush (同花连号)</strong>
            <p>Same suit and consecutive values.</p>
            <p className="example">Example: 10♠ J♠ Q♠ K♠ A♠</p>
          </li>
          <li>
            <strong>Four of a kind + one (四张相同加一)</strong>
            <p>Four cards of the same rank plus any kicker.</p>
            <p className="example">
              Example: A♠ A<span className="suit red">♥</span> A<span className="suit red">♦</span> A♣ + K♠
            </p>
          </li>
          <li>
            <strong>Full house (三张相同 + 两张相同)</strong>
            <p>Three of a kind with a pair.</p>
            <p className="example">
              Example: K♠ K<span className="suit red">♥</span> K<span className="suit red">♦</span> 10♣ 10♠
            </p>
          </li>
          <li>
            <strong>Flush (同花)</strong>
            <p>All cards same suit.</p>
            <p className="example">Example: 2♠ 5♠ 7♠ 9♠ K♠</p>
          </li>
          <li>
            <strong>Straight (连号)</strong>
            <p>Any five consecutive ranks.</p>
            <p className="example">
              Example: 5♣ 6<span className="suit red">♦</span> 7♠ 8<span className="suit red">♥</span> 9♣
            </p>
          </li>
        </ol>
      </section>

      <section className="card">
        <h2>Remember</h2>
        <ul className="tips">
          <li>J♠ Q♦ K♥ A♣ 2♠ is not a valid straight.</li>
          <li>Always compare the highest card when judging strength.</li>
        </ul>
      </section>
    </div>
  );
}

