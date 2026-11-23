export interface NavItem {
  id: string;
  num: string;
  label: string;
  en: string;
}

export interface PreviewMediaItem {
  type: 'image' | 'video' | 'embed';
  src: string;
  alt: string;
  poster?: string;
  pixelated?: boolean;
}

export interface SectionPreviewData {
  items: PreviewMediaItem[];
}

export interface ExhibitionSectionData {
  id: 'section-1' | 'section-2' | 'section-3' | 'section-4';
  number: string;
  code: string;
  floor: '1F' | '2F';
  floorTheme: 'light' | 'dark';
  category: string;
  keyword: string;
  headerTitle: string;
  intro: string[];
  artworkType: string;
  artworkTitle: string;
  description: string[];
  structuralTag: string;
  artists: string[];
  sound?: string[];
  experienceTime: string;
  participationNote: string;
  preview?: SectionPreviewData;
}

export interface CreditRow {
  role: string;
  names: string[];
  subGroup?: string;
}

export interface SponsorItem {
  id: string;
  category: 'host' | 'support' | 'origin';
  categoryLabel: string;
  nameKo: string;
  nameEn: string;
  description: string;
  details: string[];
  monogram: string;
}

export interface PosterItem {
  id: string;
  label: string;
  src: string;
  downloadName: string;
}

export const POSTERS: PosterItem[] = [
  {
    id: 'poster-01',
    label: 'POSTER 01',
    src: '/posters/poster-01.jpg',
    downloadName: 'gong-and-ju-poster-01.jpg',
  },
  {
    id: 'poster-02',
    label: 'POSTER 02',
    src: '/posters/poster-02.jpg',
    downloadName: 'gong-and-ju-poster-02.jpg',
  },
];

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', num: '01', label: '전시개요', en: 'Overview' },
  { id: 'preface', num: '02', label: '전시서문', en: 'Preface' },
  { id: 'poster', num: '03', label: '포스터', en: 'Poster' },
  { id: 'sections', num: '04', label: '작품', en: 'Works' },
  { id: 'credits', num: '05', label: '크레딧', en: 'Credits' },
  { id: 'visit', num: '06', label: '관람안내', en: 'Visit' },
  { id: 'sponsors', num: '07', label: '스폰서', en: 'Sponsors' },
];

export const EXHIBITION_META = {
  titleBracket: '⟪공과 주⟫',
  titleKorean: '공과 주',
  titleDeconstructed: '공共과 주主',
  englishMotif: 'OWN HOME OWN',
  subtitle: '서울예술대학교 학사학위 전공심화과정 독립창작프로젝트',
  originNote:
    '본 전시는 2026-2 독립창작프로젝트Ⅱ 선정작 단편영화 〈쓰레기 궁전의 신데렐라〉의 이야기를 전시의 언어로 확장합니다.',
  datesFull: '2026. 11. 25 (수) – 11. 28 (토)',
  datesCompact: '26.11.25–26.11.28 Wed–Sat',
  hours: '12:00–20:00',
  lastAdmission: '19:30 입장 마감',
  admission: '무료 관람 (현장 자유 입장)',
  venueName: '코스모스',
  venueEn: 'COSMOS',
  address: '경기 안산시 단원구 예술1길 14',
  naverMapUrl:
    'https://map.naver.com/p/search/' +
    encodeURIComponent('경기 안산시 단원구 예술1길 14'),
  kakaoMapUrl:
    'https://map.kakao.com/link/search/' +
    encodeURIComponent('경기 안산시 단원구 예술1길 14'),
};

export const PREFACE_CONTENT = {
  heading: '기획의도',
  subheading: 'EXHIBITION PREFACE',
  originNote: EXHIBITION_META.originNote,
  paragraphs: [
    '익숙한 동화 속 공주는 누군가에게 선택받고 구원받으며, 정해진 역할과 결말을 따라가는 존재로 그려져 왔다. 우리 역시 살아가며 나의 의사와 관계없이 많은 역할과 기준을 부여받는다. 그러나 아직 완결되지 않은 우리는 이야기를 재해석할 수 있고, 구조를 해체할 수 있으며, 어쩌면 그 안에서 우리만의 공간을 지어 머물 수도 있다. 《공과 주》는 ‘공주(公主)’라는 단어를 ‘공’과 ‘주’로 해체하고 재해석하며, ‘주어진 것’과 ‘스스로 짓는 것’ 사이의 관계를 조망한다.',
    '‘共(함께 공)’을 통해 서로의 선택을 존중하고 응답하며 함께 살아가는 관계의 가능성을, ‘主(주인 주)’를 통해 주어진 역할과 서사에서 벗어나 자신의 삶을 스스로 선택하는 주체성을 이야기한다.',
  ],
  closingLead:
    '전시는 재조립을 통한 개인의 이야기를 공유하며 공동의 집을 짓는다. 관객은 그저 작품을 감상하는 타자에 그치지 않고 함께 집을 구성하는 일원이 된다. 정해진 서사와 역할을 다시 쓰는 행위, 기존의 구조에 개입하고 균열을 내는 것,',
  staggeredClimax: [
    '그것으로 말미암아',
    '내가 집의 온전한 주인으로',
    '거듭나는 과정을 탐색한다.',
  ],
};

export const EXHIBITION_SECTIONS: ExhibitionSectionData[] = [
  {
    id: 'section-1',
    number: '01',
    code: 'SECTION 1',
    floor: '1F',
    floorTheme: 'light',
    category: 'FILM ROOM',
    keyword: '마주보기',
    headerTitle: '[SECTION 1] FILM ROOM – 마주보기',
    intro: [
      '익숙한 공주 서사를 현실에 비추어 바라보고, 구원의 방식에 질문을 던진다.',
      '관객은 두 청소년이 서로를 외면하지 않고 자신들의 공간을 만드는 과정을 통해, 손을 내미는 작은 용기가 가져오는 변화를 마주한다.',
    ],
    artworkType: '단편영화',
    artworkTitle: '단편영화 〈쓰레기 궁전의 신데렐라〉',
    description: [
      '동화 속 신데렐라는 왕자에게 선택받고 구원받는다. 그러나 영화의 두 청소년에게는 마법을 걸어줄 요정도, 자신을 구원해 줄 왕자도 없다.',
      '가정과 학교 어디에서도 안전함을 느끼지 못하는 열여덟 살 ‘민들레’는 돌아갈 집을 잃고 공중 여자화장실에서 문제아 선배 ‘백조희’를 만난다. 두 사람은 버려진 물건들로 자신들만의 ‘쓰레기 궁전’을 만들며, 서로에게 손을 내미는 용기가 또 다른 용기로 이어지는 가능성을 보여준다.',
    ],
    structuralTag: '1F 주主 · 2026-2 독립창작프로젝트Ⅱ 선정작',
    artists: [
      '박성훈',
      '오민영',
      '김성욱',
      '채호준',
      '노위찬',
      '박해원',
      '김휘향',
      '강예현',
      '윤다원',
      '허원중',
      '김연주',
      '박상협',
      '가람',
      '박예빈',
      '임성종',
      '엄세은',
      '장재원',
      '김호정',
    ],
    experienceTime: '단편영화 상영',
    participationNote: '1층 좌측 FILM ROOM에서 상영됩니다. 입장 시 정숙을 부탁드립니다.',
    preview: {
      items: [
        {
          type: 'video',
          src: '/previews/section-1/trailer.mp4',
          poster: '/previews/section-1/poster.jpg',
          alt: 'SECTION 1 단편영화 〈쓰레기 궁전의 신데렐라〉 트레일러',
        },
      ],
    },
  },
  {
    id: 'section-2',
    number: '02',
    code: 'SECTION 2',
    floor: '1F',
    floorTheme: 'light',
    category: '재조립',
    keyword: '허물기',
    headerTitle: '[SECTION 2] 재조립 – 허물기',
    intro: [
      '익숙한 공주 서사에 주어진 역할과 결말을 다시 쓴다.',
      '관객은 게임 속 선택을 통해 기존 이야기의 규칙을 허물고, 타인이 정한 역할에서 벗어나 스스로 선택하는 힘을 경험한다.',
    ],
    artworkType: '인터랙티브 픽셀 게임',
    artworkTitle: '인터랙티브 픽셀 게임 〈공주를 그만두는 방법〉',
    description: [
      '화려한 궁전에서 살아가던 공주는 알람 소리와 함께 평범한 학생으로 돌아온다. 학교에 갈 준비를 시작하지만, 궁전에 남고 싶은 또 다른 자신인 ‘공주의 나’가 집 안을 동화 속 공간으로 바꾸며 외출을 방해한다.',
      '관객은 네 가지 동화를 바탕으로 한 미니게임을 통해 ‘공주의 나’와 대결한다. 게임을 마칠 때마다 주어진 이야기는 새롭게 쓰이고, 마침내 자신의 선택으로 만들어낸 결말을 마주한다.',
    ],
    structuralTag: '1F 주主 · 4가지 동화 미니게임 · 인터랙티브',
    artists: ['고다선', '민지은', '송수연', '송시은', '이서윤'],
    sound: ['김나연'],
    experienceTime: '직접 플레이 참여',
    participationNote: '1층 하단 SECTION 2 공간에서 네 가지 미니게임을 직접 플레이할 수 있습니다.',
    preview: {
      items: [
        {
          type: 'image',
          src: '/previews/section-2/01.png',
          alt: 'SECTION 2 인터랙티브 픽셀 게임 〈공주를 그만두는 방법〉 타이틀 화면',
        },
        {
          type: 'image',
          src: '/previews/section-2/02.png',
          alt: 'SECTION 2 인터랙티브 픽셀 게임 〈공주를 그만두는 방법〉 방 탐색 플레이 화면',
        },
        {
          type: 'image',
          src: '/previews/section-2/03.png',
          alt: 'SECTION 2 인터랙티브 픽셀 게임 〈공주를 그만두는 방법〉 인어공주 미니게임 화면',
        },
        {
          type: 'image',
          src: '/previews/section-2/04.png',
          alt: 'SECTION 2 인터랙티브 픽셀 게임 〈공주를 그만두는 방법〉 동화 속 공간 대화 화면',
        },
      ],
    },
  },
  {
    id: 'section-3',
    number: '03',
    code: 'SECTION 3',
    floor: '2F',
    floorTheme: 'dark',
    category: '재조립',
    keyword: '짓기',
    headerTitle: '[SECTION 3] 재조립 – 짓기',
    intro: [
      '각자의 선택이 모여 함께 머물 공간을 짓는 과정을 경험한다.',
      '관객은 자신의 손길이 담긴 가구를 다른 이들의 가구와 나란히 놓으며, 서로의 자리를 받아들이고 함께 살아가는 의미를 탐색한다.',
    ],
    artworkType: '인터랙티브 미디어아트',
    artworkTitle: '인터랙티브 미디어아트 〈공가〉',
    description: [
      '아무도 살지 않는 빈집, 공가(空家)에서 이야기가 시작된다.',
      '관객이 직접 색칠한 가구가 하나씩 집 안에 들어오고, 서로 다른 손길이 닿은 물건들이 하나의 공간을 채운다. 집이 가득 차면 오래된 가구는 이사를 가고, 새로운 가구가 들어오면 집의 모습 또한 변화한다.',
      '각자의 가구와 이야기가 쌓이는 동안, 비어 있던 집은 모두가 함께 만드는 집, 공가(共家)가 된다.',
    ],
    structuralTag: '2F 공共 · 空家(빈집) → 共家(함께 만드는 집)',
    artists: ['전세원', '홍진택'],
    sound: ['권병지'],
    experienceTime: '가구 채색 및 참여',
    participationNote: '2층 좌측 SECTION 3에서 직접 색칠한 가구를 공동의 집에 배치할 수 있습니다.',
    preview: {
      items: [
        {
          type: 'video',
          src: '/previews/section-3/preview.mp4',
          poster: '/previews/section-3/poster.jpg',
          alt: 'SECTION 3 인터랙티브 미디어아트 〈공가〉 프리뷰 영상',
        },
      ],
    },
  },
  {
    id: 'section-4',
    number: '04',
    code: 'SECTION 4',
    floor: '2F',
    floorTheme: 'dark',
    category: '공동의 집',
    keyword: '응답하기',
    headerTitle: '[SECTION 4] 공동의 집 – 응답하기',
    intro: [
      '개인의 공간을 공동체로 확장하고, 함께 살아가는 데 필요한 거리와 경계를 생각한다. 관객은 자신에게 편안한 자리를 선택하고, 서로 다른 집의 이야기를 마주하며 공존의 가능성을 탐색한다.',
    ],
    artworkType: '공간',
    artworkTitle: '공간 〈각자의 집에서, 우리의 마을로〉',
    description: [
      '서로 다른 모습과 이야기를 지닌 집들이 모여 하나의 마을을 이룬다.',
      '각자의 집은 고유한 형태와 경계를 간직한 채 서로 연결되어 있다. 관객은 집과 집 사이를 머물고 이동하며 타인과의 거리를 조절하고, 자신에게 편안한 방식으로 공간을 경험한다.',
      '서로의 차이와 경계를 존중하면서도 함께 머물 수 있는 공간. 각자의 집이 모여 이루는 공동체의 가능성을 상상한다.',
    ],
    structuralTag: '2F 공共 · 체류형 공간 설치',
    artists: ['김인건', '이경민', '이정민'],
    experienceTime: '자유 이동 및 체류',
    participationNote: '2층 우측 SECTION 4에서 집과 집 사이의 거리와 경계를 자유롭게 경험할 수 있습니다.',
    preview: {
      items: [
        {
          type: 'image',
          src: '/previews/section-4/01.jpg',
          alt: 'SECTION 4 공간 〈각자의 집에서, 우리의 마을로〉 작품 미리보기',
        },
      ],
    },
  },
];

export const PRODUCTION_CREDITS: CreditRow[] = [
  { role: '지도교수', names: ['홍민기'] },
  { role: '프로젝트 총괄', names: ['오민영', '박성훈'] },
  { role: '기획 · 연출', names: ['최한나', '김채린', '염채원', '이재경'] },
  { role: '공간 디자인', names: ['김인건', '이경민', '이정민'] },
  { role: '그래픽 디자인', names: ['한시우', '이세진'] },
  { role: '사진', names: ['김재범'] },
  { role: '소프트웨어', names: ['안현준'] },
  { role: '사운드', names: ['권병지', '김나연'] },
  {
    role: 'SECTION 1',
    names: [
      '박성훈',
      '오민영',
      '김성욱',
      '채호준',
      '노위찬',
      '박해원',
      '김휘향',
      '강예현',
      '윤다원',
      '허원중',
      '김연주',
      '박상협',
      '가람',
      '박예빈',
      '임성종',
      '엄세은',
      '장재원',
      '김호정',
    ],
  },
  {
    role: 'SECTION 2',
    names: ['고다선', '민지은', '송수연', '송시은', '이서윤'],
  },
  { role: 'SECTION 3', names: ['전세원', '홍진택'] },
  { role: 'SECTION 4', names: ['김인건', '이경민', '이정민'] },
];

export const SPECIAL_THANKS_CREDITS: CreditRow[] = [
  {
    subGroup: '영화 〈쓰레기 궁전의 신데렐라〉',
    role: '연출팀',
    names: ['박예빈', '이혜원', '엄세은', '정호준'],
  },
  {
    subGroup: '영화 〈쓰레기 궁전의 신데렐라〉',
    role: '제작팀',
    names: ['최원규', '민서윤', '홍지유', '이지은', '장세윤'],
  },
  {
    subGroup: '영화 〈쓰레기 궁전의 신데렐라〉',
    role: '촬영 · 조명팀',
    names: [
      '임성종',
      '제갈유진',
      '박태준',
      '전슬빈',
      '임태규',
      '이소흔',
      '류시영',
      '육준영',
      '김하진',
    ],
  },
  {
    subGroup: '영화 〈쓰레기 궁전의 신데렐라〉',
    role: '붐 오퍼레이터',
    names: ['최종원', '김예환', '신희준'],
  },
  {
    subGroup: '전시 협력',
    role: '기획',
    names: ['장세윤', '이선미', '황수민', '김동옥'],
  },
  {
    subGroup: '전시 협력',
    role: '공간',
    names: ['김민주', '박예진', '엄윤주'],
  },
  {
    subGroup: '전시 협력',
    role: '작품',
    names: ['이지수'],
  },
];

export const SUPPORT_CREDITS: CreditRow[] = [
  {
    subGroup: '학부 및 아카이빙',
    role: '공연창작학부/미디어창작학부 책임교수',
    names: ['김승미'],
  },
  {
    subGroup: '학부 및 아카이빙',
    role: '공연창작학부 행정조교',
    names: ['김현범'],
  },
  {
    subGroup: '학부 및 아카이빙',
    role: '미디어창작학부 행정조교',
    names: ['김강은'],
  },
  {
    subGroup: '학부 및 아카이빙',
    role: '영상/아카이빙',
    names: ['황용회'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '창작실습지원센터 센터장',
    names: ['하창용'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '창작실습팀장',
    names: ['이승훈'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '무대공방',
    names: ['김예주', '이강원'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '조명',
    names: ['윤정주'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '음향',
    names: ['김경훈', '이경민'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '영상',
    names: ['박건', '이승훈'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '컴퓨터랩(아카이빙)',
    names: ['황용회'],
  },
  {
    subGroup: '〈창작실습지원센터〉',
    role: '아텍',
    names: ['김종훈'],
  },
];

export const VISITOR_GUIDELINES = [
  {
    num: '01',
    title: '추천 관람 동선 (1F 주主 → 2F 공共)',
    detail:
      '1층 입구(ENT)로 입장해 GUESTDESK와 INFORMATION을 지나 SECTION 1(단편영화) → SECTION 2(픽셀 게임)를 관람한 뒤, 2층으로 올라가 SECTION 3(인터랙티브 미디어아트) → SECTION 4(공동의 집) 순서로 이동하시기를 권장합니다.',
  },
  {
    num: '02',
    title: '관객 참여형 섹션 체험 안내',
    detail:
      'SECTION 2 〈공주를 그만두는 방법〉(게임 선택)과 SECTION 3 〈공가〉(가구 채색 참여)는 관객의 직접 참여로 완성되는 작품입니다. 대기 인원이 있을 경우 현장 안내에 따라 순차적으로 체험해 주세요.',
  },
  {
    num: '03',
    title: '상영실 관람 및 촬영 에티켓',
    detail:
      'SECTION 1 FILM ROOM 내에서는 단편영화 상영 몰입을 위해 휴대전화 화면 밝기 및 촬영을 삼가 주시기 바랍니다. 그 외 공간에서는 플래시 없는 사진 촬영이 가능합니다.',
  },
  {
    num: '04',
    title: '오시는 길 및 교통 안내',
    detail:
      '코스모스(경기 안산시 단원구 예술1길 14)는 주차 공간이 협소하므로 대중교통 이용을 권장합니다. 수도권 전철 4호선 중앙역·고잔역에서 서울예술대학교(예술1길) 방면 버스로 이동하실 수 있습니다.',
  },
];

export const SPONSORS: SponsorItem[] = [
  {
    id: 'seoularts',
    category: 'host',
    categoryLabel: 'HOST · 주최',
    nameKo: '서울예술대학교',
    nameEn: 'SEOUL INSTITUTE OF THE ARTS',
    description: '학사학위 전공심화과정 독립창작프로젝트 주최 기관',
    details: ['공연창작학부', '미디어창작학부'],
    monogram: 'SIA',
  },
  {
    id: 'bfa-project',
    category: 'host',
    categoryLabel: 'ORGANIZER · 주관',
    nameKo: '학사학위 전공심화과정 독립창작프로젝트',
    nameEn: 'BFA INDEPENDENT CREATION PROJECT',
    description: '2026-2 독립창작프로젝트Ⅱ 선정작 확장 전시 프로그램',
    details: ['공연창작학부', '미디어창작학부', '독립창작프로젝트'],
    monogram: 'ICP',
  },
  {
    id: 'practice-center',
    category: 'support',
    categoryLabel: 'PRODUCTION SUPPORT · 제작 지원',
    nameKo: '창작실습지원센터',
    nameEn: 'CREATIVE PRACTICE SUPPORT CENTER',
    description: '전시 공간 구축 및 무대·조명·음향·영상·컴퓨터랩·아텍 기술 지원',
    details: ['무대공방', '조명', '음향', '영상', '컴퓨터랩(아카이빙)', '아텍'],
    monogram: 'CPSC',
  },
  {
    id: 'cosmos-venue',
    category: 'support',
    categoryLabel: 'VENUE · 전시 공간',
    nameKo: '코스모스 (COSMOS)',
    nameEn: 'COSMOS EXHIBITION HALL',
    description: '경기 안산시 단원구 예술1길 14 · 1F 주主 / 2F 공共 전시장',
    details: ['1F SECTION 1–2', '2F SECTION 3–4'],
    monogram: 'COSMOS',
  },
  {
    id: 'cinderella-film',
    category: 'origin',
    categoryLabel: 'ORIGINAL WORK · 원작 연계',
    nameKo: '단편영화 〈쓰레기 궁전의 신데렐라〉',
    nameEn: '2026-2 INDEPENDENT CREATION PROJECT II',
    description: '본 전시의 서사적 출발점이 된 2026-2 독립창작프로젝트Ⅱ 선정 단편영화',
    details: ['연출팀', '제작팀', '촬영 · 조명팀', '붐 오퍼레이터'],
    monogram: 'FILM',
  },
];
