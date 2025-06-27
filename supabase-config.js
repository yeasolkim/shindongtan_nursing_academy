// Supabase 설정 파일
// 실제 프로젝트 URL과 API 키로 교체하세요

const SUPABASE_URL = 'https://wihirzfnqrvytzdnmdcc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpaGlyemZucXJ2eXR6ZG5tZGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MzA0NjcsImV4cCI6MjA2NjQwNjQ2N30.yw2GdaVveCjh41Gia70tuaqbw1M6l8D8YUDztt31G1w';

// supabase 변수명 충돌 방지
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 데이터베이스 함수들
const db = {
  // 공지사항 관련 함수
  notices: {
    // 모든 공지사항 가져오기
    async getAll() {
      const { data, error } = await supabaseClient
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // 최신 공지사항 N개 가져오기
    async getLatest(limit = 5) {
      const { data, error } = await supabaseClient
        .from('notices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    },

    // 특정 공지사항 가져오기
    async getById(id) {
      const { data, error } = await supabaseClient
        .from('notices')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    // 조회수 증가
    async incrementViews(id) {
      const { data, error } = await supabaseClient
        .from('notices')
        .update({ views: supabaseClient.sql`views + 1` })
        .eq('id', id);
      
      if (error) throw error;
      return data;
    }
  },

  // Q&A 관련 함수
  qa: {
    // 모든 Q&A 가져오기
    async getAll() {
      const { data, error } = await supabaseClient
        .from('qa')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // 최신 Q&A N개 가져오기
    async getLatest(limit = 7) {
      const { data, error } = await supabaseClient
        .from('qa')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data;
    }
  },

  // 갤러리 관련 함수
  gallery: {
    // 모든 갤러리 항목 가져오기
    async getAll() {
      const { data, error } = await supabaseClient
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // 조회수 증가
    async incrementViews(id) {
      const { data, error } = await supabaseClient
        .from('gallery')
        .update({ views: supabaseClient.sql`views + 1` })
        .eq('id', id);
      
      if (error) throw error;
      return data;
    }
  },

  // 취업/구인 관련 함수
  jobs: {
    // 모든 구인 정보 가져오기
    async getAll() {
      const { data, error } = await supabaseClient
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    // 조회수 증가
    async incrementViews(id) {
      const { data, error } = await supabaseClient
        .from('jobs')
        .update({ views: supabaseClient.sql`views + 1` })
        .eq('id', id);
      
      if (error) throw error;
      return data;
    }
  },

  // 강사진 관련 함수
  instructors: {
    // 모든 강사 정보 가져오기
    async getAll() {
      const { data, error } = await supabaseClient
        .from('instructors')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  },

  // 시설(갤러리) 관련 함수
  facilities: {
    // 모든 시설 이미지 가져오기
    async getAll() {
      const { data, error } = await supabaseClient
        .from('facilities')
        .select('*')
        .order('order', { ascending: true });
      if (error) throw error;
      return data;
    }
  }
};

// 전역 객체로 내보내기
window.supabaseClient = supabaseClient;
window.db = db; 