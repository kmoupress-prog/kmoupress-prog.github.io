#!/usr/bin/env ruby
#
# Per-post license override.
# A post (or a `defaults` scope in _config.yml) can set
#   license:
#     name: CC BY-NC-SA 4.0
#     link: https://creativecommons.org/licenses/by-nc-sa/4.0/
# and the license line at the bottom of that post shows it instead of the
# site-wide default from the theme's locale file.

Jekyll::Hooks.register :posts, :post_render do |post|
  license = post.data['license']
  next unless license.is_a?(Hash) && license['name'] && license['link']

  lang = post.site.config['lang']
  locale = post.site.data.dig('locales', lang) || {}
  template = locale.dig('copyright', 'license', 'template') ||
             '이 기사는 저작권자의 :LICENSE_NAME 라이센스를 따릅니다.'

  anchor = %(<a href="#{license['link']}">#{license['name']}</a>)
  text = template.sub(':LICENSE_NAME', anchor)

  post.output = post.output.sub(
    %r{(<div class="license-wrapper">).*?(</div>)}m,
    "\\1#{text}\\2"
  )
end
