const TemplatePackage = require("../../TemplatePackage");
const AppSnippet = require("../../AppSnippet");
const IndexSnippet = require("../../IndexSnippet");

class ReactAntdStaticTemplate extends TemplatePackage {
  constructor() {
    super({
      name: 'react-antd-static',
      description: 'React antd static',
      fileToSnippet: {
        '/src/App.js': new AppSnippet(),
        '/src/index.js': new IndexSnippet(),
      },
      requires: 'create-react-app',
      receives: ['credentials', 'charts']
    });
  }
}

module.exports = ReactAntdStaticTemplate;
