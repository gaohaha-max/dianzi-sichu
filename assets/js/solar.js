/* 节气时令 + 中医饮食推荐
 * 24 节气：起止日期 / 季节 / 马卡龙渐变兜底色 / 动漫背景图文件名
 * 每个节气给出中医角度的「宜吃」「忌吃」（各 3-4 项，含简述理由）
 */
(function (global) {
  // 边界：每年该节气大致开始日期（公历）。getTerm 按 (月,日) 比对。
  var TERMS = [
    { key: 'xiaohan', name: '小寒', m: 1, d: 6, season: '冬', grad: ['#E8F1FF', '#EFE6FF'], img: 'assets/img/term-xiaohan.jpg' },
    { key: 'dahan', name: '大寒', m: 1, d: 20, season: '冬', grad: ['#DCEBFF', '#E9E2FF'], img: 'assets/img/term-dahan.jpg' },
    { key: 'lichun', name: '立春', m: 2, d: 4, season: '春', grad: ['#FFE6EE', '#DDF3E6'], img: 'assets/img/term-lichun.jpg' },
    { key: 'yushui', name: '雨水', m: 2, d: 19, season: '春', grad: ['#FFEAF1', '#E2F4EC'], img: 'assets/img/term-yushui.jpg' },
    { key: 'jingzhe', name: '惊蛰', m: 3, d: 6, season: '春', grad: ['#FBE9F2', '#E6F6E2'], img: 'assets/img/term-jingzhe.jpg' },
    { key: 'chunfen', name: '春分', m: 3, d: 21, season: '春', grad: ['#F6E9F4', '#EAF7E6'], img: 'assets/img/term-chunfen.jpg' },
    { key: 'qingming', name: '清明', m: 4, d: 5, season: '春', grad: ['#EAF6E4', '#FBF1DA'], img: 'assets/img/term-qingming.jpg' },
    { key: 'guyu', name: '谷雨', m: 4, d: 20, season: '春', grad: ['#E7F7E3', '#FBEFD8'], img: 'assets/img/term-guyu.jpg' },
    { key: 'lixia', name: '立夏', m: 5, d: 6, season: '夏', grad: ['#FFF1D6', '#D6ECFF'], img: 'assets/img/term-lixia.jpg' },
    { key: 'xiaoman', name: '小满', m: 5, d: 21, season: '夏', grad: ['#FFF3D9', '#D9EEFF'], img: 'assets/img/term-xiaoman.jpg' },
    { key: 'mangzhong', name: '芒种', m: 6, d: 6, season: '夏', grad: ['#FFF6DC', '#DCF0FF'], img: 'assets/img/term-mangzhong.jpg' },
    { key: 'xiazhi', name: '夏至', m: 6, d: 21, season: '夏', grad: ['#FFF8E0', '#D2ECFF'], img: 'assets/img/term-xiazhi.jpg' },
    { key: 'xiaoshu', name: '小暑', m: 7, d: 7, season: '夏', grad: ['#FFF4D4', '#CFE9FF'], img: 'assets/img/term-xiaoshu.jpg' },
    { key: 'dashu', name: '大暑', m: 7, d: 23, season: '夏', grad: ['#FFF0CC', '#C9E6FF'], img: 'assets/img/term-dashu.jpg' },
    { key: 'liqiu', name: '立秋', m: 8, d: 8, season: '秋', grad: ['#FFEAD9', '#F7E6D6'], img: 'assets/img/term-liqiu.jpg' },
    { key: 'chushu', name: '处暑', m: 8, d: 23, season: '秋', grad: ['#FFE6D2', '#F4E2D2'], img: 'assets/img/term-chushu.jpg' },
    { key: 'bailu', name: '白露', m: 9, d: 8, season: '秋', grad: ['#FDEBDD', '#F0E0DD'], img: 'assets/img/term-bailu.jpg' },
    { key: 'qiufen', name: '秋分', m: 9, d: 23, season: '秋', grad: ['#FBE8D6', '#EDE0DC'], img: 'assets/img/term-qiufen.jpg' },
    { key: 'hanlu', name: '寒露', m: 10, d: 8, season: '秋', grad: ['#F8E4CC', '#EADBDA'], img: 'assets/img/term-hanlu.jpg' },
    { key: 'shuangjiang', name: '霜降', m: 10, d: 23, season: '秋', grad: ['#F6DFC2', '#E7D6D4'], img: 'assets/img/term-shuangjiang.jpg' },
    { key: 'lidong', name: '立冬', m: 11, d: 7, season: '冬', grad: ['#EAF0FF', '#F0E8FF'], img: 'assets/img/term-lidong.jpg' },
    { key: 'xiaoxue', name: '小雪', m: 11, d: 22, season: '冬', grad: ['#E4ECFF', '#EFE6FF'], img: 'assets/img/term-xiaoxue.jpg' },
    { key: 'daxue', name: '大雪', m: 12, d: 7, season: '冬', grad: ['#E0E9FF', '#EEE4FF'], img: 'assets/img/term-daxue.jpg' },
    { key: 'dongzhi', name: '冬至', m: 12, d: 22, season: '冬', grad: ['#DCE6FF', '#ECE2FF'], img: 'assets/img/term-dongzhi.jpg' }
  ];

  // 中医饮食推荐：每个节气 宜吃 / 忌吃（各 3-4 项，含理由）
  var REC = {
    lichun: { good: [{ n: '韭菜', w: '辛温升阳，助肝气升发' }, { n: '豆芽', w: '清热升发，疏通气机' }, { n: '枸杞', w: '养肝明目，平补肝肾' }], bad: [{ n: '油腻厚味', w: '碍脾生湿，阻滞阳气' }, { n: '寒凉生冷', w: '伤阳遏升发之气' }, { n: '过酸收敛', w: '酸主收敛，不利肝气疏泄' }] },
    yushui: { good: [{ n: '山药', w: '健脾益胃，助运化' }, { n: '红枣', w: '补中养血，温润脾胃' }, { n: '蜂蜜', w: '润燥养肺，缓春燥' }], bad: [{ n: '生冷黏腻', w: '伤脾阳，生痰湿' }, { n: '过咸', w: '咸走肾，春宜省咸增甘' }, { n: '肥甘厚味', w: '助湿生热' }] },
    jingzhe: { good: [{ n: '梨', w: '润肺生津，清春温' }, { n: '菠菜', w: '养肝养血，润燥' }, { n: '荠菜', w: '凉肝清热，利湿' }], bad: [{ n: '辛辣过度', w: '助肝阳上亢化火' }, { n: '海鲜发物', w: '易诱发宿疾过敏' }, { n: '肥甘厚腻', w: '困脾生痰' }] },
    chunfen: { good: [{ n: '春笋', w: '清热化痰，利膈爽胃' }, { n: '芹菜', w: '平肝降压，凉血清热' }, { n: '银耳', w: '润肺生津，平衡阴阳' }], bad: [{ n: '大寒大热', w: '春分阴阳平，忌偏颇' }, { n: '过酸过辣', w: '扰动肝木' }, { n: '油腻', w: '碍脾' }] },
    qingming: { good: [{ n: '艾草青团', w: '温经散寒，应节养阳' }, { n: '荠菜', w: '凉肝清热，明目' }, { n: '螺蛳', w: '清热利湿（适量）' }], bad: [{ n: '发物', w: '清明易过敏，慎虾蟹笋' }, { n: '辛辣', w: '助火伤阴' }, { n: '油腻', w: '困脾' }] },
    guyu: { good: [{ n: '香椿', w: '健脾理气，升发阳气' }, { n: '薏米', w: '健脾祛湿，利关节' }, { n: '黄豆芽', w: '清热利湿，补充维生素' }], bad: [{ n: '甜腻生湿', w: '谷雨湿气重，忌助湿' }, { n: '生冷', w: '伤脾阳' }, { n: '油腻', w: '助湿' }] },
    lixia: { good: [{ n: '苦瓜', w: '清心泻火，解暑热' }, { n: '绿豆', w: '清热解毒，消暑利水' }, { n: '樱桃', w: '养心养血，温补而不燥' }], bad: [{ n: '辛辣', w: '夏宜清，辛辣助火' }, { n: '油腻', w: '碍脾生湿' }, { n: '过咸', w: '夏心气旺，咸伤心' }] },
    xiaoman: { good: [{ n: '苦瓜', w: '清热解暑，除烦' }, { n: '黄瓜', w: '清热利水，生津' }, { n: '薏米', w: '健脾祛湿，防湿热' }], bad: [{ n: '生冷冰镇', w: '寒伤脾阳，湿从内生' }, { n: '甜腻', w: '生湿化痰' }, { n: '油腻', w: '助湿热' }] },
    mangzhong: { good: [{ n: '绿豆', w: '清热解毒，消暑' }, { n: '冬瓜', w: '利水渗湿，清热' }, { n: '番茄', w: '生津止渴，凉血平肝' }], bad: [{ n: '油腻辛辣', w: '湿热交蒸，忌助热' }, { n: '生冷', w: '伤阳生湿' }, { n: '过饱', w: '芒种湿热，宜清淡' }] },
    xiazhi: { good: [{ n: '西瓜', w: '清热解暑，生津止渴' }, { n: '绿豆汤', w: '解毒消暑，利水' }, { n: '苦瓜', w: '清心降火' }], bad: [{ n: '冰镇过度', w: '寒凝伤阳，脾阳受损' }, { n: '油腻', w: '夏至阳盛，忌碍运' }, { n: '辛辣', w: '助火伤阴' }] },
    xiaoshu: { good: [{ n: '莲藕', w: '清热凉血，健脾开胃' }, { n: '冬瓜', w: '利水消暑，清热' }, { n: '莲子', w: '养心安神，清心火' }], bad: [{ n: '辛辣', w: '助暑热上火' }, { n: '油腻', w: '碍脾生湿' }, { n: '冰饮', w: '寒伤脾阳' }] },
    dashu: { good: [{ n: '绿豆', w: '解毒消暑第一品' }, { n: '丝瓜', w: '清热化痰，凉血' }, { n: '冬瓜', w: '利水消肿，清热' }], bad: [{ n: '油腻厚味', w: '大暑湿热，忌助湿' }, { n: '辛辣', w: '助火' }, { n: '冰镇暴饮', w: '骤寒伤阳' }] },
    liqiu: { good: [{ n: '梨', w: '润燥生津，养肺' }, { n: '百合', w: '润肺止咳，清心' }, { n: '银耳', w: '滋阴润肺，养胃' }], bad: [{ n: '辛辣', w: '秋燥当令，辛辣伤阴' }, { n: '烧烤油炸', w: '助燥生热' }, { n: '生冷', w: '伤脾阳' }] },
    chushu: { good: [{ n: '莲子', w: '养心安神，健脾' }, { n: '银耳', w: '润燥养肺，滋阴' }, { n: '南瓜', w: '健脾益气，温润' }], bad: [{ n: '辛辣', w: '伤阴助燥' }, { n: '油腻', w: '困脾' }, { n: '冰饮', w: '伤阳' }] },
    bailu: { good: [{ n: '梨', w: '润肺止咳，清白露燥' }, { n: '银耳', w: '滋阴润肺，生津' }, { n: '蜂蜜', w: '润燥养肺，润肠' }], bad: [{ n: '辛辣', w: '白露凉燥，辛辣伤阴' }, { n: '烧烤', w: '助燥' }, { n: '生冷海鲜', w: '脾胃易受寒' }] },
    qiufen: { good: [{ n: '梨', w: '润燥，平秋分燥气' }, { n: '百合', w: '润肺清心，安神' }, { n: '芝麻', w: '滋阴润燥，补肝肾' }], bad: [{ n: '辛辣油炸', w: '秋燥忌燥烈' }, { n: '生冷', w: '伤脾阳' }, { n: '过咸', w: '咸走血，秋宜润' }] },
    hanlu: { good: [{ n: '梨', w: '润肺，应寒露凉燥' }, { n: '柿子', w: '润肺生津（适量，忌空腹）' }, { n: '银耳', w: '滋阴润燥' }], bad: [{ n: '生冷', w: '寒露渐寒，生冷伤阳' }, { n: '辛辣', w: '伤阴化燥' }, { n: '油腻', w: '碍脾' }] },
    shuangjiang: { good: [{ n: '柿子', w: '健脾润肺，应节' }, { n: '栗子', w: '补肾强筋，温补脾肾' }, { n: '山药', w: '健脾益肾，润燥' }], bad: [{ n: '生冷', w: '霜降寒重，生冷伤阳' }, { n: '辛辣', w: '伤阴' }, { n: '油腻', w: '困脾生湿' }] },
    lidong: { good: [{ n: '羊肉', w: '温补脾肾，助阳气敛藏' }, { n: '萝卜', w: '下气消食，解进补之腻' }, { n: '黑芝麻', w: '补肾润燥，益精血' }], bad: [{ n: '生冷寒凉', w: '立冬宜藏，寒伤阳' }, { n: '过度温燥', w: '未病温补太过助火' }, { n: '生冷海鲜', w: '伤脾阳' }] },
    xiaoxue: { good: [{ n: '羊肉', w: '温补气血，御寒' }, { n: '核桃', w: '补肾温肺，润肠' }, { n: '红枣', w: '补中养血，温脾' }], bad: [{ n: '生冷', w: '小雪寒，生冷伤阳' }, { n: '油腻', w: '碍运' }, { n: '寒凉瓜果', w: '伤脾阳' }] },
    daxue: { good: [{ n: '羊肉', w: '温阳散寒，补肾' }, { n: '桂圆', w: '补心脾，益气血' }, { n: '黑豆', w: '补肾利水，黑色入肾' }], bad: [{ n: '生冷', w: '大雪寒盛，生冷伤阳' }, { n: '寒凉', w: '伤阳' }, { n: '油腻', w: '碍脾' }] },
    dongzhi: { good: [{ n: '羊肉饺子', w: '温补阳气，应节养藏' }, { n: '桂圆', w: '补气血，养心脾' }, { n: '红枣', w: '温中养血' }], bad: [{ n: '生冷', w: '冬至一阳生，忌寒伤阳' }, { n: '寒凉', w: '伤阳' }, { n: '过度进补', w: '虚不受补反生热' }] },
    xiaohan: { good: [{ n: '羊肉', w: '温肾助阳，御极寒' }, { n: '核桃', w: '补肾温肺' }, { n: '栗子', w: '补肾强筋，暖脾' }], bad: [{ n: '生冷', w: '小寒最冷，生冷伤阳' }, { n: '寒凉', w: '伤阳' }, { n: '油腻', w: '碍运' }] },
    dahan: { good: [{ n: '羊肉', w: '温补收尾，固本' }, { n: '红枣', w: '温中养血' }, { n: '黑豆', w: '补肾益精' }], bad: [{ n: '生冷', w: '大寒极冷，生冷伤阳' }, { n: '寒凉', w: '伤阳' }, { n: '油腻', w: '困脾' }] }
  };

  function getTerm(date) {
    date = date || new Date();
    var md = (date.getMonth() + 1) * 100 + date.getDate();
    var cur = TERMS[TERMS.length - 1]; // 默认大寒（年初早于小寒的部分归大寒）
    for (var i = 0; i < TERMS.length; i++) {
      var t = TERMS[i];
      var tmd = t.m * 100 + t.d;
      if (md >= tmd) cur = t;
    }
    // 若早于当年第一个边界（小寒 1/6），则属于上一年大寒之后，仍归大寒
    var first = TERMS[0];
    if (md < first.m * 100 + first.d) cur = TERMS[TERMS.length - 1];
    return cur;
  }

  function getRecommend(key) {
    return REC[key] || { good: [], bad: [] };
  }

  global.Solar = {
    TERMS: TERMS,
    getTerm: getTerm,
    getRecommend: getRecommend
  };
})(window);
