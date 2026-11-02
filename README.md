# metricalizer2

Rule-based meter analysis for German poems. For each syllable it computes stress from orthography and word position. It then picks the meter that fits with the least metrical complexity: alternating meters, free filling (Senkungsfreiheit), alcaic, sapphic and asclepiadean odes, distichs, or free rhythm. For every deviation it names the licence or violation, and it labels the rhyme scheme. It runs as a Deno CLI and as a static page: https://kmein.github.io/metricalizer2/

## Based on

The pipeline follows Metricalizer² by Klemens Bobenhausen and colleagues:

- K. Bobenhausen, B. Hammerich: „Métrique littéraire, métrique linguistique et métrique algorithmique de l'allemand mises en jeu dans le programme Metricalizer²", *Langages* 199 (2015), [doi:10.3917/lang.199.0067](https://doi.org/10.3917/lang.199.0067). This is the source for the numeric stress score and its binarised form, prosodic dominance, the choice between meter templates by minimal complexity, and the complexity weights for licences and violations.
- K. Bobenhausen, I. Gehl: „Automatisches metrisches Markup", *Jahrbuch für Computerphilologie* 7 (2009), [archived online version](http://web.archive.org/web/20161107225645id_/http://computerphilologie.tu-darmstadt.de/jg07/bobgehl.html). This is the source for rule-based stress evidence without a dictionary, "blühen" as the worked example, and stem consonant clusters.

The complexity messages are the German wording of the original. The licence and violation weights were read off analyses archived from metricalizer.de (`fixtures/m2/`).

## Why it had to be rebuilt

Metricalizer² was a web service only. Its code and its stress rules were never published; the 2009 paper defers the full rule set to a later publication that never appeared. metricalizer.de is no longer reachable. That left German computational metrics without a reference implementation of this approach to run or compare against.

So the rule set here is new. It is built from the rule categories the papers describe, not copied from the original. The stanza-form lookup against Frank and Schlawe is not included, because those databases were never released.

## Use

    nix run github:kmein/metricalizer2 -- analyse poem.txt [--format json] [--meter <family>]
    nix run . -- evaluate gold <haider-kuhn.tsv>   # against the Haider & Kuhn German gold set
    nix run . -- evaluate m2 fixtures/m2           # against the archived Metricalizer² analyses

The input is plain text: blank lines separate stanzas, and the header lines `#Titel:` and `#Autor:` are optional. The gold TSV is not committed because its repository has no licence. It comes from [tnhaider/metrical-tagging-in-the-wild](https://github.com/tnhaider/metrical-tagging-in-the-wild) (`data/German/SmallGold/`).

Everything under `src/` except `cli.ts` and `evaluate.ts` must stay free of `Deno`, because the page bundles it unchanged for the browser.
