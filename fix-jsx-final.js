const fs = require('fs');

console.log('開始修復JSX錯誤...');

// 讀取文件
let content = fs.readFileSync('./client/src/pages/coach/CoachDashboard.js', 'utf8');
const lines = content.split('\n');

// 修復第679行：將</button>改為</div>
if (lines[678] && lines[678].includes('</button>')) {
  lines[678] = lines[678].replace('</button>', '</div>');
  console.log('修復第679行：將</button>改為</div>');
}

// 修復第686行：添加缺失的</button>
if (lines[685] && lines[685].includes('發送郵件')) {
  lines[685] = lines[685] + '\n                                      </button>';
  console.log('修復第686行：添加缺失的</button>');
}

// 修復第711行：添加缺失的</button>
if (lines[710] && lines[710].includes('<ChevronLeftIcon')) {
  lines[710] = lines[710] + '\n                        </button>';
  console.log('修復第711行：添加缺失的</button>');
}

// 修復第717行：添加缺失的</button>
if (lines[716] && lines[716].includes('<ChevronRightIcon')) {
  lines[716] = lines[716] + '\n                        </button>';
  console.log('修復第717行：添加缺失的</button>');
}

// 修復第748行：將</a>改為</div>
if (lines[747] && lines[747].includes('</a>')) {
  lines[747] = lines[747].replace('</a>', '</div>');
  console.log('修復第748行：將</a>改為</div>');
}

// 修復第672行：添加缺失的</div>
if (lines[671] && lines[671].includes('<div className="flex gap-2">')) {
  lines[671] = lines[671] + '\n                                    </div>';
  console.log('修復第672行：添加缺失的</div>');
}

// 修復第742行：添加缺失的</div>
if (lines[741] && lines[741].includes('<div className="mt-3 flex flex-wrap gap-2">')) {
  lines[741] = lines[741] + '\n                </div>';
  console.log('修復第742行：添加缺失的</div>');
}

// 修復第754行：添加缺失的</Link>和</div>
if (lines[753] && lines[753].includes('查看詳情')) {
  lines[753] = lines[753] + '\n                  </Link>\n                </div>';
  console.log('修復第754行：添加缺失的</Link>和</div>');
}

// 寫入修復後的內容
fs.writeFileSync('./client/src/pages/coach/CoachDashboard.js', lines.join('\n'));
console.log('修復完成！');